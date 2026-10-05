import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_PATH ||
    (process.platform === "win32"
      ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
      : undefined),
  headless: true,
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});
const page = await browser.newPage({
  viewport: { width: 1200, height: 1200 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.BASE_URL || "http://localhost:5175/", {
  waitUntil: "networkidle",
});
const result = await page.evaluate(async () => {
  const THREE = await import("/node_modules/.vite/deps/three.js");
  const { createAnimal } = await import("/src/models.ts");
  const { animals } = await import("/src/data.ts");
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;z-index:1000";
  document.body.append(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(1200, 1200);
  renderer.setScissorTest(true);
  renderer.setClearColor("#26332c");
  let count = 0;
  const failures = [];
  for (const [i, a] of animals.filter(a => a.shape).entries()) {
    const { root, dispose } = createAnimal(a);
    const scene = new THREE.Scene();
    scene.add(root);
    scene.add(new THREE.HemisphereLight("#ffffff", "#5b584c", 2.5));
    const light = new THREE.DirectionalLight("#fff2d0", 3);
    light.position.set(4, 5, 6);
    scene.add(light);
    const bounds = new THREE.Box3().setFromObject(root);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3()).length();
    if (!Number.isFinite(size) || size <= 0) failures.push(a.id);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    camera.position
      .copy(center)
      .add(
        new THREE.Vector3(1.5, 0.7, 3).normalize().multiplyScalar(size * 1.3),
      );
    camera.lookAt(center);
    const x = (i % 6) * 200,
      y = 1000 - Math.floor(i / 6) * 200;
    renderer.setViewport(x, y, 200, 200);
    renderer.setScissor(x, y, 200, 200);
    renderer.render(scene, camera);
    const label = document.createElement("span");
    label.textContent = a.name;
    label.style.cssText = `position:fixed;left:${x + 10}px;top:${1200 - y - 25}px;z-index:1001;color:#d8eacb;font:12px sans-serif;`;
    document.body.append(label);
    dispose();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material)
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          m.dispose(),
        );
    });
    count++;
  }
  return { count, failures, glError: renderer.getContext().getError() };
});
await page.screenshot({ path: "test-results/all-models.png" });
await browser.close();
console.log(result, errors);
assert.equal(result.count, 36);
assert.deepEqual(result.failures, []);
assert.equal(result.glError, 0);
assert.deepEqual(errors, []);
console.log("All 36 model geometries rendered successfully.");
