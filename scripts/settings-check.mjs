import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";

await fs.mkdir("test-results", { recursive: true });
const server = await createServer({
  server: { host: "127.0.0.1", port: 5176, strictPort: true },
});
await server.listen();
const base = "http://127.0.0.1:5176/";
let browser;
try {
  const { animals } = await server.ssrLoadModule("/src/data.ts");
  const { localizeAnimal } = await server.ssrLoadModule(
    "/src/localizeAnimal.ts",
  );
  for (const animal of animals) {
    const english = localizeAnimal(animal, "en");
    for (const key of [
      "name",
      "region",
      "diet",
      "size",
      "lifespan",
      "description",
      "fact",
      "status",
    ]) {
      assert.ok(english[key]?.length, `${animal.id}: missing ${key}`);
      assert.ok(
        !/[\u3400-\u9fff]/u.test(english[key]),
        `${animal.id}: untranslated ${key}`,
      );
    }
    if (animal.china)
      assert.ok(
        english.china.region && !/[\u3400-\u9fff]/u.test(english.china.region),
      );
  }
  const executablePath =
    process.env.BROWSER_PATH ??
    (process.platform === "win32"
      ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
      : undefined);
  browser = await chromium.launch({
    executablePath: executablePath || undefined,
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Exercise real speech lifecycle callbacks without depending on CI audio drivers.
  await page.addInitScript(() => {
    window.speechLog = [];
    window.speechCancelled = 0;
    window.activeSpeech = null;
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        constructor(text) {
          this.text = text;
        }
      },
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [
          { lang: "zh-CN", localService: true },
          { lang: "en-US", localService: true },
        ],
        speak: (utterance) => {
          window.speechLog.push({
            text: utterance.text,
            lang: utterance.lang,
            rate: utterance.rate,
          });
          window.activeSpeech = utterance;
          utterance.onstart?.();
        },
        cancel: () => {
          window.speechCancelled++;
          window.activeSpeech = null;
        },
      },
    });
  });
  await page.route("**/*", (route) =>
    route.request().url().startsWith(base) ? route.continue() : route.abort(),
  );
  await page.goto(base, { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "ocean");
  await expect(page.locator(".app-status")).toHaveCount(0);
  const fullscreen = page.locator(".app-header .fullscreen-button");
  await expect(fullscreen).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".map-tools .fullscreen-button")).toHaveCount(0);
  await fullscreen.click();
  await expect(fullscreen).toHaveAttribute("aria-label", "退出全屏");
  await expect(fullscreen).toHaveAttribute("aria-pressed", "true");
  await fullscreen.click();
  await expect(fullscreen).toHaveAttribute("aria-pressed", "false");
  await fullscreen.click();
  await page.evaluate(() => document.exitFullscreen());
  await expect(fullscreen).toHaveAttribute("aria-label", "全屏");
  // Simulate the browser prompt callback, not an OS installation. Dispatch before
  // opening Settings so this also checks that the event is retained globally.
  const offerInstall = (outcome, fails = false) => page.evaluate(({ outcome, fails }) => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.prompt = async () => {
      window.installPromptCalls = (window.installPromptCalls || 0) + 1;
      if (fails) throw new Error("Browser refused installation");
    };
    event.userChoice = Promise.resolve({ outcome });
    window.dispatchEvent(event);
  }, { outcome, fails });
  await offerInstall("dismissed");
  await page.getByRole("button", { name: "设置与说明", exact: true }).click();
  await page.getByRole("button", { name: "安装到设备" }).click();
  await expect(page.getByRole("button", { name: "安装到设备" })).toHaveCount(0);
  await expect(page.locator(".install-app")).not.toContainText("应用已安装");
  await offerInstall("accepted", true);
  await page.getByRole("button", { name: "安装到设备" }).click();
  await expect(page.locator(".install-app [role=alert]")).toContainText("安装未完成");
  await offerInstall("accepted");
  await page.getByRole("button", { name: "安装到设备" }).click();
  await expect(page.locator(".install-app")).not.toContainText("应用已安装");
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(page.locator(".install-app")).toContainText("应用已安装");
  assert.equal(await page.evaluate(() => window.installPromptCalls), 3);
  await page.getByRole("button", { name: "墨绿森林" }).click();
  const forestColor = await page
    .locator(".app-dialog")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.getByRole("button", { name: "大地沙丘" }).click();
  const sandColor = await page
    .locator(".app-dialog")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  assert.notEqual(forestColor, sandColor);
  await page.getByRole("button", { name: "大字", exact: true }).click();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByLabel("Narration speed").selectOption("0.8");
  await page.getByRole("button", { name: "Listen EN", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stop narration EN" }),
  ).toBeVisible();
  let last = await page.evaluate(() => window.speechLog.at(-1));
  assert.equal(last.lang, "en-US");
  assert.equal(last.rate, 0.8);
  assert.match(last.text, /Welcome/);
  await page.getByRole("button", { name: "Stop narration EN" }).click();
  await page.getByRole("button", { name: "Listen EN", exact: true }).click();
  // Changing language must cancel the previous utterance and ignore late callbacks.
  await page.evaluate(() => {
    window.lateSpeech = window.activeSpeech;
  });
  await page.getByRole("button", { name: "简体中文", exact: true }).click();
  await page.evaluate(() => window.lateSpeech.onend());
  await expect(
    page.getByRole("button", { name: "语音介绍 中文", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "语音介绍 中文", exact: true })
    .click();
  last = await page.evaluate(() => window.speechLog.at(-1));
  assert.equal(last.lang, "zh-CN");
  assert.match(last.text, /欢迎/);
  await page.getByRole("tab", { name: "使用说明", exact: true }).click();
  assert.equal(await page.evaluate(() => window.activeSpeech), null);
  await expect(page.getByRole("heading", { name: "从地球开始" })).toBeVisible();
  await page.getByRole("tab", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "Azure ocean" }).click();
  await page.getByRole("switch", { name: "Gentle animal animation" }).click();
  await page.screenshot({ path: "test-results/settings-desktop.png" });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Settings and guide", exact: true }),
  ).toBeFocused();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-font-size", "large");
  await expect(
    page.getByRole("button", { name: "Rotate globe", exact: true }),
  ).toBeDisabled();
  await page.getByRole("textbox", { name: "Search species" }).fill("大熊猫");
  await expect(page.locator(".species-row")).toHaveCount(1);
  await page.getByRole("button", { name: "View details", exact: true }).click();
  await expect(page.locator(".animal-description")).toContainText("bamboo");
  assert.ok(
    await page
      .locator(".animal-description")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 16),
  );
  await page.getByRole("button", { name: "Listen EN", exact: true }).click();
  await page.evaluate(() => window.activeSpeech.onend());
  assert.match(
    (await page.evaluate(() => window.speechLog.at(-1))).text,
    /pandas|bamboo/i,
  );
  await page.getByRole("button", { name: "Local 3D", exact: true }).click();
  await page.locator(".animal-canvas canvas").waitFor();
  await expect(
    page.getByRole("button", { name: "Play animal animation", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => window.activeSpeech), null);
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await page
    .getByRole("button", { name: "Settings and guide", exact: true })
    .click();
  await page.getByRole("switch", { name: "Gentle animal animation" }).click();
  await page.getByRole("button", { name: "Comfortable", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "View details", exact: true }).click();
  await page.getByRole("button", { name: "Local 3D", exact: true }).click();
  const canvas = page.locator(".animal-canvas canvas");
  await canvas.waitFor();
  await page.waitForTimeout(400);
  const animated1 = await canvas.screenshot();
  await page.waitForTimeout(500);
  const animated2 = await canvas.screenshot();
  assert.notDeepEqual(animated1, animated2, "Local model moves gently");
  await page
    .getByRole("button", { name: "Pause animal animation", exact: true })
    .click();
  await page.waitForTimeout(200);
  const paused1 = await canvas.screenshot();
  await page.waitForTimeout(350);
  const paused2 = await canvas.screenshot();
  assert.deepEqual(paused1, paused2, "Paused model holds its pose");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", { name: "Play animal animation", exact: true }),
  ).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.keyboard.press("Escape");
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [360, 640],
    [320, 568],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    for (const size of ["Large", "Comfortable"]) {
      console.log(`Checking ${width}x${height}, ${size}`);
      await page
        .getByRole("button", { name: "Settings and guide", exact: true })
        .click();
      await page.getByRole("button", { name: size, exact: true }).click();
      assert.equal(
        await page
          .locator(".settings-content")
          .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
        false,
        `${width}: settings width`,
      );
      await page.getByRole("tab", { name: "Guide", exact: true }).click();
      await page.locator(".guide-sources a").last().scrollIntoViewIfNeeded();
      await page.keyboard.press("Escape");
      if (width <= 850)
        await page
          .getByRole("button", { name: "Open species list", exact: true })
          .click();
      await page.waitForFunction(() => {
        const row = document
          .querySelector(".species-row:last-child")
          .getBoundingClientRect();
        const list = document
          .querySelector(".species-list")
          .getBoundingClientRect();
        return row.bottom <= list.bottom + 1;
      });
      assert.equal(
        await page
          .locator(".catalog-pane")
          .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
        false,
        `${width}: catalog width`,
      );
      if (width <= 850)
        await page
          .getByRole("button", { name: "Close species list", exact: true })
          .click();
      assert.equal(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth > innerWidth ||
            document.documentElement.scrollHeight > innerHeight,
        ),
        false,
        `${width}: viewport overflow`,
      );
      const actions = await page.locator(".header-actions").boundingBox();
      assert.ok(actions.x + actions.width <= width, `${width}: header fits`);
      const scope = await page.locator(".scope-switch").boundingBox();
      assert.ok(scope.x + scope.width <= actions.x, `${width}: header controls do not overlap`);
      await expect(page.locator(".app-header .fullscreen-button")).toBeVisible();
      await page
        .getByRole("button", { name: "View details", exact: true })
        .click();
      const bounds = await page.getByRole("dialog").boundingBox();
      assert.ok(
        bounds.x >= 0 &&
          bounds.y >= 0 &&
          bounds.x + bounds.width <= width &&
          bounds.y + bounds.height <= height,
      );
      await page.locator(".animal-fact").scrollIntoViewIfNeeded();
      assert.equal(
        await page
          .locator(".detail-panel")
          .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
        false,
        `${width}: detail width`,
      );
      if (width === 390 && size === "Large")
        await page.screenshot({
          path: "test-results/settings-mobile-detail.png",
        });
      await page.keyboard.press("Escape");
    }
    if (width === 390)
      await page.screenshot({ path: "test-results/settings-mobile.png" });
  }
  await page
    .getByRole("button", { name: "Settings and guide", exact: true })
    .click();
  await page.evaluate(() => {
    speechSynthesis.getVoices = () => [{ lang: "fr-FR", localService: true }];
  });
  await page.getByRole("button", { name: "Listen EN", exact: true }).click();
  await expect(page.locator(".speech-error")).toContainText("Install a voice");
  await page.keyboard.press("Escape");
  assert.deepEqual(errors, []);
  const ios = await browser.newPage({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  });
  await ios.goto(base);
  await ios.getByRole("button", { name: "设置与说明", exact: true }).click();
  await expect(ios.locator(".install-app")).toContainText("添加到主屏幕");
  await ios.getByRole("button", { name: "English", exact: true }).click();
  await expect(ios.locator(".install-app")).toContainText("Add to Home Screen");
  await ios.addInitScript(() => Object.defineProperty(navigator, "standalone", { value: true }));
  await ios.reload();
  await ios.getByRole("button", { name: "Settings and guide", exact: true }).click();
  await expect(ios.locator(".install-app")).toContainText("The app is installed");
  await expect(ios.locator(".install-app")).not.toContainText("Add to Home Screen");
  await ios.close();
  console.log(
    "PASS: all 125 English records; themes, persistence, narration lifecycle, missing voices, reduced motion, animation pause, fullscreen, simulated install outcomes, iOS guidance, and seven viewports in both font sizes",
  );
} finally {
  await browser?.close();
  await server.close();
}
