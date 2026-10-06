import { readFile, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

// Derive installation icons from the existing W mark; no external artwork.
const source = await readFile(new URL("../public/favicon.svg", import.meta.url), "utf8");
const browser = await chromium.launch({
  executablePath: (process.env.BROWSER_PATH ?? (process.platform === "win32"
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" : undefined)) || undefined,
  headless: true,
});
try {
  const page = await browser.newPage();
  const directory = new URL("../public/icons/", import.meta.url);
  await mkdir(directory, { recursive: true });
  for (const [name, size, padding] of [
    ["icon-192.png", 192, 0], ["icon-512.png", 512, 0],
    ["apple-touch-icon.png", 180, 0], ["maskable-512.png", 512, 8],
  ]) {
    const data = await page.evaluate(async ({ source, size, padding }) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const context = canvas.getContext("2d");
      context.fillStyle = "#111b19";
      context.fillRect(0, 0, size, size);
      const icon = new Image();
      icon.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
      await icon.decode();
      const inset = size * padding / 80;
      context.drawImage(icon, inset, inset, size - 2 * inset, size - 2 * inset);
      return canvas.toDataURL("image/png").split(",")[1];
    }, { source, size, padding });
    await writeFile(new URL(name, directory), Buffer.from(data, "base64"));
  }
} finally {
  await browser.close();
}
