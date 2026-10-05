import fs from "node:fs/promises";
import { createServer } from "vite";

// Incremental: retain existing local images and their attribution records.
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
let species;
try {
  species = (await server.ssrLoadModule("/src/data.ts")).animals.map((a) => ({
    id: a.id,
    wiki: a.wiki,
  }));
} finally {
  await server.close();
}
species.push({ id: "mountain", wiki: "Tibetan_Plateau" });
if (new Set(species.map((a) => a.id)).size !== species.length)
  throw new Error("Duplicate species ids");
const credits = JSON.parse(
  await fs.readFile("public/image-credits.json", "utf8"),
);
const headers = {
  "User-Agent": "WildAtlas/1.0 (local educational wildlife atlas)",
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const lastRequest = new Map();
async function request(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    let candidate = url;
    if (url.includes("upload.wikimedia.org")) {
      candidate = url.split("?")[0];
      // If thumbnail generation is throttled, use the licensed original after
      // the server's retry interval instead of requesting more thumbnail sizes.
      if (attempt > 0 && candidate.includes("/thumb/"))
        candidate = candidate
          .replace("/thumb/", "/")
          .slice(0, candidate.replace("/thumb/", "/").lastIndexOf("/"));
    }
    const host = new URL(candidate).host;
    await pause(
      Math.max(0, 2500 - (Date.now() - (lastRequest.get(host) || 0))),
    );
    lastRequest.set(host, Date.now());
    const response = await fetch(candidate, {
      headers,
      signal: AbortSignal.timeout(30000),
    });
    if (response.ok) return response;
    if (attempt === 5) throw new Error(`${response.status}: ${url}`);
    const retryAfter = Number(response.headers.get("retry-after")) || 5;
    console.log(`Retry ${host} in ${retryAfter + 2}s (${response.status})`);
    await pause((retryAfter + 2) * 1000);
  }
}
const missing = [];
for (const a of species) {
  const exists = await fs.stat(`public/images/${a.id}.jpg`).then(
    () => true,
    () => false,
  );
  if (
    !exists ||
    !credits.find((c) => c.id === a.id)?.license ||
    process.argv.includes(`--refresh=${a.id}`)
  )
    missing.push(a);
}
const failures = [];
for (let i = 0; i < missing.length; i += 12) {
  const batch = missing.slice(i, i + 12);
  const query = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "pageimages",
    pithumbsize: "960",
    redirects: "1",
    titles: batch.map((a) => a.wiki).join("|"),
  });
  const data = await request(
    `https://en.wikipedia.org/w/api.php?${query}`,
  ).then((r) => r.json());
  const canonical = (title) => {
    let name = title.replaceAll("_", " ");
    for (const mapping of [
      ...(data.query.normalized || []),
      ...(data.query.redirects || []),
    ])
      if (mapping.from.replaceAll("_", " ") === name) name = mapping.to;
    return name;
  };
  const pages = Object.values(data.query.pages);
  // This article has no pageimage; use the species photograph from Commons.
  for (const page of pages) {
    if (page.title === "Chinese sturgeon") {
      page.pageimage = "Acipenser_sinensis.JPG";
      page.thumbnail = {
        source:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Acipenser_sinensis.JPG/960px-Acipenser_sinensis.JPG",
      };
    }
    if (page.title === "Tibetan antelope") {
      page.pageimage = "Chiru (Pantholops hodgsonii) 01.jpg";
      page.thumbnail = {
        source:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Chiru_%28Pantholops_hodgsonii%29_01.jpg/960px-Chiru_%28Pantholops_hodgsonii%29_01.jpg",
      };
    }
  }
  const metaQuery = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "extmetadata",
    titles: pages
      .filter((p) => p.pageimage)
      .map((p) => `File:${p.pageimage}`)
      .join("|"),
  });
  const metadata = await request(
    `https://commons.wikimedia.org/w/api.php?${metaQuery}`,
  ).then((r) => r.json());
  for (const a of batch) {
    try {
      const page = pages.find((p) => p.title === canonical(a.wiki));
      if (!page?.thumbnail) throw new Error("No photograph in article");
      const m = Object.values(metadata.query.pages).find(
        (p) =>
          p.title.replaceAll("_", " ") ===
          `File:${page.pageimage}`.replaceAll("_", " "),
      )?.imageinfo?.[0]?.extmetadata;
      if (!m?.LicenseShortName?.value)
        throw new Error(`Missing license: ${page.pageimage}`);
      const url = page.thumbnail.source.replace(
        "thumb.wikimedia.org",
        "upload.wikimedia.org",
      );
      const response = await request(url);
      if (!response.headers.get("content-type")?.startsWith("image/"))
        throw new Error("Not an image");
      await fs.writeFile(
        `public/images/${a.id}.jpg`,
        Buffer.from(await response.arrayBuffer()),
      );
      const record = {
        id: a.id,
        title: page.title,
        file: page.pageimage,
        source: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(page.pageimage)}`,
        article: `https://en.wikipedia.org/wiki/${a.wiki}`,
        provider: "Wikimedia Commons",
        artist: m.Artist?.value,
        license: m.LicenseShortName.value,
        licenseUrl: m.LicenseUrl?.value,
        credit: m.Credit?.value,
      };
      const index = credits.findIndex((c) => c.id === a.id);
      if (index < 0) credits.push(record);
      else credits[index] = record;
      console.log("Saved", a.id, record.license);
    } catch (e) {
      failures.push(a.id);
      console.error(a.id, String(e));
    }
    await fs.writeFile(
      "public/image-credits.json",
      JSON.stringify(credits, null, 2),
    );
  }
}
console.log(
  `${species.length} assets; ${credits.length} attribution records; failures: ${failures.join(", ") || "none"}`,
);
if (failures.length) process.exitCode = 1;
