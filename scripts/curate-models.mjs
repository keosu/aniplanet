import fs from "node:fs/promises";
// Public viewer embeds only. Model files are not downloaded or redistributed.
const selection = {
  lion: "678e161ce0b44d6cbae5f03bc4541116",
  elephant: "bd9c2acc4cfe428e875ab1515bea8bf1",
  giraffe: "20a57636ec0c44c996e7f36313792cea",
  zebra: "2122a53a65b547fbbce6bb1086d0fadb",
  cheetah: "7ab852bab0cd48c28c2cb5b4a8090ac8",
  tiger: "1d78025a4e1f45b0842b1e200e71aefd",
  panda: "d3701425617940afa35f8733fc7cd1a3",
  orangutan: "3c05383164c64ba9840d526c12966805",
  redfox: "a3c7171c6f0a42b8be04f0cbd67dd112",
  "brown-bear": "3d6216c0714645e585a07636ad0f2f90",
  "blue-whale": "c20252aa7eed48ef90b6ac605fcde51f",
  orca: "8d653c6928394d418cab272d4369be56",
  dolphin: "d165e4ce842d408e99133f77f1fc37fb",
  "whale-shark": "696e939ce00a431eb5820f87366d474c",
  "sea-turtle": "e29502b321ad428ababe94320afc0a5c",
  "polar-bear": "134bee26bfce47afbf7e7150c02a8d34",
  "emperor-penguin": "c8b8e089864745acab41a105928c355a",
  "arctic-fox": "bc7d9139c9ee434287f8ea12a55b9d2b",
  ostrich: "a319aafe15554ac284761c4154d49d62",
};
const models = {};
await fs.mkdir("tmp/model-review", { recursive: true });
const entries = Object.entries(selection);
for (let i = 0; i < entries.length; i += 4) {
  await Promise.all(
    entries.slice(i, i + 4).map(async ([id, uid]) => {
      const r = await fetch(`https://api.sketchfab.com/v3/models/${uid}`);
      if (!r.ok) throw new Error(`${id}: ${r.status}`);
      const model = await r.json();
      models[id] = {
        uid,
        title: model.name,
        author: model.user.displayName,
        authorUrl: model.user.profileUrl,
        url: model.viewerUrl,
        animationCount: model.animationCount,
        faceCount: model.faceCount,
        license: model.license?.label || "Original author public viewer",
        licenseUrl: model.license?.url || null,
        delivery: "embed",
        isDownloadable: model.isDownloadable === true,
        downloadCheckedAt: new Date().toISOString().slice(0, 10),
        ...(id === "tiger" ? { variant: "东北虎个体" } : {}),
      };
      const preview =
        model.thumbnails.images
          .sort((a, b) => b.width - a.width)
          .find((t) => t.width <= 1200) || model.thumbnails.images[0];
      await fs.writeFile(
        `tmp/model-review/${id}.jpg`,
        Buffer.from(await fetch(preview.url).then((r) => r.arrayBuffer())),
      );
      console.log(id, model.name, model.animationCount);
    }),
  );
}
await fs.writeFile(
  "src/realistic-models.json",
  JSON.stringify(models, null, 2),
);
await fs.writeFile(
  "public/model-credits.json",
  JSON.stringify(
    {
      notice:
        "Models are displayed through the original authors’ public Sketchfab embeds. Model assets have not been downloaded, relicensed, or redistributed. Embedding is distinct from a license to download or reuse model files.",
      models,
    },
    null,
    2,
  ),
);
await fs.writeFile(
  "tmp/model-review/selected.html",
  `<html><meta charset="utf-8"><style>body{margin:0;background:#172019;color:#ddd;font:12px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:10px}img{width:100%;height:180px;object-fit:contain;background:#111}p{margin:6px}</style>${Object.keys(
    selection,
  )
    .map(
      (id) =>
        `<div><img src="${id}.jpg"><p>${id} · ${models[id].author}</p></div>`,
    )
    .join("")}</html>`,
);
