import fs from "node:fs/promises";
const credits = JSON.parse(
  await fs.readFile("public/image-credits.json", "utf8"),
);
const headers = { "User-Agent": "WildAtlasEducationalDemo/1.0" };
if (!credits.some((c) => c.id === "camel")) {
  const j = await fetch(
    "https://en.wikipedia.org/w/api.php?action=query&titles=Wild_Bactrian_camel&prop=pageimages&format=json&pithumbsize=800",
    { headers },
  ).then((r) => r.json());
  const p = Object.values(j.query.pages)[0];
  const url = p.thumbnail.source.replace(
    "thumb.wikimedia.org",
    "upload.wikimedia.org",
  );
  const r = await fetch(url, { headers });
  if (r.ok) {
    await fs.writeFile(
      "public/images/camel.jpg",
      Buffer.from(await r.arrayBuffer()),
    );
    credits.push({
      id: "camel",
      title: p.title,
      file: p.pageimage,
      source:
        "https://commons.wikimedia.org/wiki/File:" +
        encodeURIComponent(p.pageimage),
      article: "https://en.wikipedia.org/wiki/Wild_Bactrian_camel",
    });
    console.log("camel saved");
  } else console.log("camel status", r.status);
}
const files = credits.filter((c) => c.file);
for (let i = 0; i < files.length; i += 8) {
  const group = files.slice(i, i + 8);
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=" +
    encodeURIComponent(group.map((c) => "File:" + c.file).join("|"));
  const json = await fetch(url, { headers }).then((r) => r.json());
  for (const page of Object.values(json.query.pages)) {
    const c = group.find(
      (c) =>
        ("File:" + c.file).replaceAll("_", " ") ===
        page.title.replaceAll("_", " "),
    );
    const m = page.imageinfo?.[0]?.extmetadata;
    if (c && m)
      Object.assign(c, {
        artist: m.Artist?.value,
        license: m.LicenseShortName?.value,
        licenseUrl: m.LicenseUrl?.value,
        credit: m.Credit?.value,
      });
  }
}
await fs.writeFile(
  "public/image-credits.json",
  JSON.stringify(credits, null, 2),
);
console.log(
  "With attribution:",
  credits.filter((c) => c.artist).length,
  "of",
  files.length,
);
