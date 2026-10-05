import * as THREE from "three";
import type { Animal } from "./data";

export function createAnimal(animal: Animal) {
  if (!animal.shape) throw new Error(`No local schematic for ${animal.id}`);
  const root = new THREE.Group();
  const moving: THREE.Object3D[] = [];
  let seed = 53;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = animal.color;
  ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 27000; i++) {
    ctx.fillStyle =
      rand() > 0.5 ? "rgba(255,244,209,.08)" : "rgba(35,25,18,.10)";
    ctx.fillRect(rand() * 512, rand() * 256, 1 + rand() * 4, 0.6);
  }
  if (["tiger", "zebra"].includes(animal.id)) {
    ctx.fillStyle = "#282921";
    for (let i = 0; i < 20; i++) {
      const x = i * 27;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 40, 65, x - 25, 130, x + 10, 256);
      ctx.lineTo(x + 20, 256);
      ctx.bezierCurveTo(x - 5, 120, x + 62, 70, x + 15, 0);
      ctx.fill();
    }
  }
  if (["cheetah", "giraffe", "whale-shark"].includes(animal.id)) {
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle =
        animal.id === "whale-shark"
          ? "#bac6b1"
          : animal.id === "giraffe"
            ? "#72502e"
            : "#493926";
      ctx.beginPath();
      const radius =
        animal.id === "giraffe" ? 10 + rand() * 11 : 2 + rand() * 3;
      ctx.ellipse(
        rand() * 512,
        rand() * 256,
        radius,
        radius * 0.7,
        rand() * 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const skin = new THREE.MeshStandardMaterial({ map, roughness: 0.88 });
  const material = (color: string, roughness = 0.9) =>
    new THREE.MeshStandardMaterial({ color, roughness });
  const dark = material("#252720");
  const ivory = material("#ddd6b8");
  const pale = material("#d9c9a6");
  const mesh = (
    shape: THREE.BufferGeometry,
    mat: THREE.Material,
    pos: number[],
    scale: number[],
    parent: THREE.Object3D = root,
  ) => {
    const obj = new THREE.Mesh(shape, mat);
    obj.position.set(pos[0], pos[1], pos[2]);
    obj.scale.set(scale[0], scale[1], scale[2]);
    obj.castShadow = true;
    obj.receiveShadow = true;
    parent.add(obj);
    return obj;
  };
  const ball = (
    pos: number[],
    scale: number[],
    mat: THREE.Material = skin,
    parent: THREE.Object3D = root,
  ) => mesh(new THREE.SphereGeometry(1, 32, 24), mat, pos, scale, parent);
  const bone = (
    from: number[],
    to: number[],
    r1: number,
    r2: number,
    mat: THREE.Material = skin,
    parent: THREE.Object3D = root,
  ) => {
    const a = new THREE.Vector3(...from),
      b = new THREE.Vector3(...to);
    const c = mesh(
      new THREE.CylinderGeometry(r2, r1, a.distanceTo(b), 16),
      mat,
      a.clone().add(b).multiplyScalar(0.5).toArray(),
      [1, 1, 1],
      parent,
    );
    c.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.sub(a).normalize(),
    );
    return c;
  };
  const curve = (
    points: number[][],
    radius: number,
    mat: THREE.Material = skin,
    parent: THREE.Object3D = root,
  ) =>
    mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        32,
        radius,
        10,
        false,
      ),
      mat,
      [0, 0, 0],
      [1, 1, 1],
      parent,
    );
  const eyes = (x: number, y: number, z: number, size = 0.044) => {
    for (const sign of [-1, 1]) {
      ball([x, y, z * sign], [size, size, size], dark);
      ball(
        [x + 0.015, y + 0.014, z * sign + sign * 0.022],
        [size * 0.22, size * 0.22, size * 0.22],
        ivory,
      );
    }
  };
  const fin = (points: number[][], mat = skin) => {
    const shape = new THREE.Shape();
    points.forEach((p, i) =>
      i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1]),
    );
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.065,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.055,
      bevelSegments: 3,
      steps: 1,
    });
    geo.translate(0, 0, -0.032);
    return mesh(geo, mat, [0, 0, 0], [1, 1, 1]);
  };
  const aquatic = ["whale", "shark", "dolphin", "ray", "turtle"].includes(
    animal.shape,
  );
  if (["whale", "shark", "dolphin"].includes(animal.shape)) {
    const whale = animal.shape === "whale",
      dolphin = animal.shape === "dolphin";
    const profile = [
      [-2.05, 0.055],
      [-1.8, 0.1],
      [-1.5, 0.17],
      [-1.15, 0.25],
      [-0.7, 0.36],
      [-0.15, 0.45],
      [0.4, 0.48],
      [0.85, 0.43],
      [1.2, 0.34],
      [1.47, 0.25],
      [1.61, 0.13],
      [1.66, 0.015],
    ];
    const spline = new THREE.SplineCurve(
      profile.map(([x, r]) => new THREE.Vector2(r, x)),
    );
    const bodyGeo = new THREE.LatheGeometry(spline.getPoints(70), 48);
    bodyGeo.rotateZ(-Math.PI / 2);
    mesh(bodyGeo, skin, [0, 0.1, 0], [1, whale ? 0.85 : 0.7, whale ? 1 : 0.8]);
    if (dolphin) ball([1.68, 0.05, 0], [0.3, 0.075, 0.095]);
    const tail = new THREE.Group();
    tail.position.set(-2.0, 0.1, 0);
    root.add(tail);
    moving.push(tail);
    for (const sign of [-1, 1]) {
      const fluke = fin([
        [0.05, 0],
        [-0.18, 0.42],
        [-0.52, 0.84],
        [-0.7, 0.88],
        [-0.52, 0.23],
        [-0.58, 0],
      ]);
      tail.add(fluke);
      fluke.rotation.x = (sign * Math.PI) / 2;
      const flipper = fin([
        [0.6, 0],
        [0.1, 0.63],
        [-0.2, 0.85],
        [-0.11, 0.48],
        [0.3, 0],
      ]);
      flipper.rotation.x = (sign * Math.PI) / 2;
      flipper.position.set(0, -0.1, sign * 0.27);
      flipper.rotation.y = sign * 0.2;
    }
    if (animal.shape === "shark") tail.rotation.x = Math.PI / 2;
    const dorsal = fin(
      animal.id === "blue-whale"
        ? [
            [-1.14, 0.3],
            [-1.05, 0.46],
            [-0.75, 0.35],
          ]
        : [
            [-0.65, 0.4],
            [-0.5, animal.id === "orca" ? 1.19 : 0.95],
            [0.06, 0.43],
          ],
    );
    dorsal.position.y = 0.02;
    if (animal.id === "orca") {
      ball([0.3, -0.17, 0], [1.05, 0.21, 0.35], ivory);
      for (const sign of [-1, 1])
        ball([1.09, 0.23, sign * 0.3], [0.17, 0.083, 0.023], ivory);
    }
    if (animal.id === "blue-whale") {
      for (let i = 0; i < 9; i++)
        curve(
          [
            [1.38, -0.06, (i - 4) * 0.025],
            [0.8, -0.24, (i - 4) * 0.042],
            [0.1, -0.282, (i - 4) * 0.04],
          ],
          0.004,
          material("#57777c"),
        );
    }
    eyes(1.37, 0.16, 0.215, 0.02);
    curve(
      [
        [1.32, -0.045, -0.265],
        [1.63, 0.006, 0],
        [1.32, -0.045, 0.265],
      ],
      0.008,
      dark,
    );
    if (animal.shape === "shark")
      for (let i = 0; i < 5; i++)
        for (const sign of [-1, 1])
          curve(
            [
              [0.62 - i * 0.065, 0.16, sign * 0.335],
              [0.59 - i * 0.065, -0.07, sign * 0.335],
            ],
            0.009,
            dark,
          );
  } else if (animal.shape === "ray") {
    ball([0, 0, 0], [0.95, 0.14, 0.55]);
    for (const sign of [-1, 1]) {
      const wing = fin(
        [
          [0.7, 0],
          [-0.2, 1.9],
          [-0.8, 0.25],
        ],
        skin,
      );
      wing.rotation.x = (sign * Math.PI) / 2;
      moving.push(wing);
    }
    curve(
      [
        [-0.7, 0, 0],
        [-1.4, -0.02, 0],
        [-2.2, -0.15, 0.15],
      ],
      0.027,
    );
    for (const sign of [-1, 1])
      curve(
        [
          [0.7, 0, sign * 0.22],
          [1.06, 0.02, sign * 0.31],
          [1.14, 0.12, sign * 0.25],
        ],
        0.09,
      );
    eyes(0.75, 0.08, 0.36, 0.043);
  } else if (animal.shape === "turtle") {
    ball([0, 0, 0], [1, 0.3, 0.7], material("#9c956c"));
    ball([-0.04, 0.17, 0], [1.04, 0.4, 0.77]);
    for (let i = 0; i < 5; i++)
      curve(
        [
          [-0.7 + i * 0.33, 0.4, -0.51],
          [-0.75 + i * 0.35, 0.56, 0],
          [-0.7 + i * 0.33, 0.4, 0.51],
        ],
        0.017,
        dark,
      );
    curve(
      [
        [-0.95, 0.25, 0],
        [0, 0.57, 0],
        [0.93, 0.25, 0],
      ],
      0.017,
      dark,
    );
    ball([1.08, 0.06, 0], [0.4, 0.21, 0.25]);
    eyes(1.31, 0.14, 0.17, 0.04);
    for (const sign of [-1, 1]) {
      const flipper = ball([0.48, -0.1, sign * 0.94], [0.28, 0.075, 0.63]);
      flipper.rotation.y = sign * 0.55;
      moving.push(flipper);
      ball([-0.77, -0.08, sign * 0.68], [0.3, 0.05, 0.26]);
    }
  } else if (animal.shape === "bird" || animal.shape === "penguin") {
    const penguin = animal.shape === "penguin",
      owl = animal.id === "snowy-owl",
      long = !penguin && !owl;
    ball([0, long ? 1.18 : 0.83, 0], [0.5, 0.7, 0.36]);
    ball(
      [0.04, long ? 1.15 : 0.86, 0.19],
      [0.43, 0.58, 0.2],
      penguin ? ivory : skin,
    );
    const headY = long ? 2.3 : 1.65;
    curve(
      [
        [0.2, 1.3, 0],
        [0.5, 1.8, 0],
        [0.36, headY, 0],
      ],
      long ? 0.1 : 0.19,
    );
    ball([0.4, headY, 0], [0.23, 0.25, 0.21]);
    const beak = bone(
      [0.54, headY - 0.02, 0],
      [0.94, headY - 0.08, 0],
      0.1,
      0.015,
      penguin ? material("#c39348") : dark,
    );
    if (owl) beak.scale.y = 0.5;
    eyes(0.49, headY + 0.04, 0.18, 0.043);
    for (const sign of [-1, 1]) {
      const wing = ball(
        [-0.04, long ? 1.27 : 1.05, sign * 0.35],
        [0.36, long ? 0.46 : 0.55, 0.1],
        penguin ? dark : skin,
      );
      wing.rotation.x = sign * 0.14;
      moving.push(wing);
      bone(
        [0.0, long ? 0.86 : 0.4, sign * 0.2],
        [0.1, 0.13, sign * 0.2],
        0.035,
        0.025,
        long ? material("#b58778") : dark,
      );
      ball(
        [0.21, 0.09, sign * 0.2],
        [0.23, 0.055, 0.12],
        penguin ? dark : material("#b18d74"),
      );
    }
    if (animal.id === "crane")
      ball([0.38, headY + 0.21, 0], [0.13, 0.06, 0.15], material("#a64637"));
    if (penguin)
      for (const sign of [-1, 1])
        ball(
          [0.36, 1.54, sign * 0.16],
          [0.13, 0.23, 0.04],
          material("#e8b04a"),
        );
  } else if (animal.shape === "ape") {
    ball([0, 1.1, 0], [0.64, 0.8, 0.45]);
    ball([0.25, 1.93, 0], [0.4, 0.42, 0.36]);
    ball([0.54, 1.87, 0], [0.19, 0.24, 0.3], dark);
    eyes(0.64, 2.02, 0.2, 0.04);
    for (const sign of [-1, 1]) {
      ball([-0.08, 0.48, sign * 0.37], [0.3, 0.48, 0.27]);
      bone([0.22, 1.62, sign * 0.48], [0.76, 0.27, sign * 0.66], 0.22, 0.14);
      ball([0.78, 0.18, sign * 0.67], [0.25, 0.16, 0.2], dark);
      ball([0.19, 0.15, sign * 0.35], [0.35, 0.14, 0.23], dark);
    }
  } else if (animal.shape === "crocodile") {
    ball([0, 0.42, 0], [1.24, 0.27, 0.4]);
    ball([1.14, 0.4, 0], [0.75, 0.18, 0.3]);
    ball([1.6, 0.36, 0], [0.45, 0.09, 0.23]);
    eyes(1.14, 0.59, 0.24, 0.065);
    curve(
      [
        [-0.9, 0.4, 0],
        [-1.55, 0.28, 0],
        [-2.16, 0.19, 0.4],
        [-2.7, 0.15, 0.6],
      ],
      0.14,
    );
    for (let i = 0; i < 15; i++)
      for (const sign of [-1, 1]) {
        const s = fin(
          [
            [0, 0],
            [0.08, 0.13],
            [0.16, 0],
          ],
          dark,
        );
        s.position.set(-1 + i * 0.15, 0.64, sign * 0.13);
      }
    for (const x of [-0.7, 0.7])
      for (const sign of [-1, 1]) {
        bone([x, 0.4, sign * 0.22], [x - 0.15, 0.15, sign * 0.61], 0.13, 0.08);
        ball([x + 0.05, 0.1, sign * 0.62], [0.25, 0.07, 0.13]);
      }
  } else {
    const elephant = animal.shape === "elephant",
      giraffe = animal.shape === "giraffe",
      bear = animal.shape === "bear",
      fox = animal.shape === "wolf",
      otter = animal.shape === "otter",
      camel = animal.shape === "camel",
      rhino = animal.id === "rhino",
      hippo = animal.id === "hippo";
    const bodyY = giraffe ? 1.82 : elephant ? 1.44 : otter ? 0.6 : 1.03;
    const bodyH = elephant
      ? 0.78
      : bear
        ? 0.65
        : hippo
          ? 0.63
          : otter
            ? 0.28
            : 0.47;
    const bodyW = elephant
      ? 0.64
      : hippo
        ? 0.61
        : bear
          ? 0.53
          : otter
            ? 0.29
            : 0.39;
    ball([-0.05, bodyY, 0], [elephant ? 1.23 : 1.03, bodyH, bodyW]);
    ball([0.52, bodyY + 0.1, 0], [0.56, bodyH * 1.05, bodyW * 0.98]);
    ball([-0.72, bodyY - 0.02, 0], [0.47, bodyH * 0.98, bodyW]);
    for (const x of [-0.71, 0.64])
      for (const sign of [-1, 1]) {
        const z = sign * bodyW * 0.68;
        const top = bodyY - 0.1;
        const width = elephant
          ? 0.2
          : bear
            ? 0.19
            : hippo
              ? 0.21
              : otter
                ? 0.1
                : 0.11;
        const legmat = animal.id === "panda" ? dark : skin;
        ball([x, top - 0.18, z], [width * 1.5, 0.34, width * 1.3], legmat);
        bone(
          [x, top, z],
          [x + (x < 0 ? 0.12 : -0.06), 0.18, z],
          width * 1.2,
          width,
          legmat,
        );
        ball(
          [x + 0.09, 0.13, z],
          [width * 1.5, 0.13, width * 1.16],
          animal.shape === "hoof" || camel ? dark : legmat,
        );
      }
    const headY = giraffe
      ? 3.25
      : camel
        ? 2.05
        : elephant
          ? 1.97
          : bear
            ? 1.39
            : otter
              ? 0.79
              : 1.48;
    if (giraffe || camel) {
      bone(
        [0.6, bodyY, 0],
        [1.08, headY - 0.13, 0],
        giraffe ? 0.24 : 0.22,
        0.17,
      );
      ball([1.22, headY, 0], [0.38, 0.23, 0.22]);
    } else {
      ball(
        [1.03, headY, 0],
        [
          elephant ? 0.51 : bear ? 0.41 : 0.35,
          elephant ? 0.56 : bear ? 0.4 : 0.34,
          elephant ? 0.47 : hippo ? 0.43 : 0.3,
        ],
      );
    }
    if (!elephant) {
      ball(
        [giraffe ? 1.48 : hippo ? 1.48 : 1.32, headY - 0.11, 0],
        [
          hippo ? 0.47 : fox ? 0.32 : bear ? 0.27 : 0.23,
          hippo ? 0.24 : 0.16,
          hippo ? 0.39 : 0.19,
        ],
        fox || bear ? pale : skin,
      );
      ball(
        [giraffe ? 1.68 : hippo ? 1.84 : fox ? 1.6 : 1.51, headY - 0.075, 0],
        [0.075, 0.057, hippo ? 0.2 : 0.095],
        dark,
      );
    }
    if (!["lion", "panda"].includes(animal.id))
      eyes(
        giraffe ? 1.37 : 1.2,
        headY + 0.1,
        giraffe ? 0.19 : elephant ? 0.41 : hippo ? 0.38 : 0.26,
        elephant ? 0.03 : 0.033,
      );
    for (const sign of [-1, 1]) {
      if (elephant) {
        const ear = ball([0.84, 2.02, sign * 0.5], [0.3, 0.53, 0.115]);
        ear.rotation.x = sign * 0.35;
      } else if (fox) {
        const ear = mesh(
          new THREE.ConeGeometry(
            animal.id === "fennec" ? 0.17 : 0.13,
            animal.id === "fennec" ? 0.58 : 0.33,
            24,
          ),
          skin,
          [0.94, headY + 0.35, sign * 0.2],
          [1, 1, 0.55],
        );
        ear.rotation.x = sign * 0.17;
      } else
        ball(
          [giraffe ? 1.06 : 0.88, headY + 0.25, sign * 0.25],
          [0.13, 0.17, 0.085],
          animal.id === "panda" ? dark : skin,
        );
    }
    if (elephant) {
      curve(
        [
          [1.36, 1.89, 0],
          [1.5, 1.4, 0],
          [1.65, 0.85, 0],
          [1.9, 0.64, 0],
          [2.0, 0.85, 0],
        ],
        0.15,
      );
      for (const sign of [-1, 1])
        curve(
          [
            [1.32, 1.61, sign * 0.26],
            [1.64, 1.4, sign * 0.32],
            [1.93, 1.5, sign * 0.31],
          ],
          0.048,
          ivory,
        );
    }
    if (animal.id === "lion") {
      const mane = material("#63503a");
      ball([0.79, 1.43, 0], [0.43, 0.53, 0.42], mane);
      ball([1.12, 1.51, 0], [0.34, 0.29, 0.28]);
      ball([1.4, 1.37, 0], [0.22, 0.14, 0.205], material("#cbbb91"));
      ball([1.59, 1.42, 0], [0.05, 0.037, 0.073], dark);
      eyes(1.31, 1.61, 0.235, 0.028);
      for (const sign of [-1, 1]) {
        curve(
          [
            [1.49, 1.3, 0],
            [1.43, 1.28, sign * 0.12],
            [1.29, 1.31, sign * 0.18],
          ],
          0.009,
          dark,
        );
        for (let i = 0; i < 4; i++)
          curve(
            [
              [1.44, 1.38 - i * 0.019, sign * 0.16],
              [1.43, 1.4 - i * 0.026, sign * 0.3],
              [1.34, 1.4 - i * 0.03, sign * 0.46],
            ],
            0.0025,
            ivory,
          );
      }
      const fur = new THREE.InstancedMesh(
        new THREE.ConeGeometry(0.014, 0.19, 4),
        mane,
        1200,
      );
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 1200; i++) {
        const a = rand() * Math.PI * 2;
        const r = 0.83 + rand() * 0.19;
        dummy.position.set(
          0.57 + rand() * 0.44,
          1.45 + Math.sin(a) * 0.49 * r,
          Math.cos(a) * 0.42 * r,
        );
        dummy.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(
            -0.3,
            -0.7 + Math.sin(a) * 0.4,
            Math.cos(a) * 0.5,
          ).normalize(),
        );
        dummy.scale.setScalar(0.6 + rand() * 0.8);
        dummy.updateMatrix();
        fur.setMatrixAt(i, dummy.matrix);
      }
      fur.castShadow = true;
      root.add(fur);
    }
    if (animal.id === "panda") {
      for (const sign of [-1, 1])
        ball([1.24, 1.5, sign * 0.245], [0.11, 0.15, 0.07], dark);
      eyes(1.28, 1.53, 0.29, 0.034);
    }
    if (giraffe) {
      for (const sign of [-1, 1]) {
        bone([1.1, 3.38, sign * 0.13], [1.06, 3.63, sign * 0.13], 0.04, 0.027);
        ball([1.06, 3.64, sign * 0.13], [0.055, 0.06, 0.055], dark);
      }
    }
    if (camel) {
      for (const x of [-0.45, 0.25]) ball([x, 1.63, 0], [0.35, 0.56, 0.32]);
    }
    if (rhino) {
      bone([1.42, 1.63, 0], [1.54, 2.0, 0], 0.13, 0.008, ivory);
      bone([1.12, 1.72, 0], [1.15, 1.88, 0], 0.08, 0.005, ivory);
    }
    if (["oryx", "addax", "reindeer"].includes(animal.id)) {
      for (const sign of [-1, 1]) {
        curve(
          [
            [0.95, 1.74, sign * 0.14],
            [0.66, 2.2, sign * 0.2],
            [0.37, 2.65, sign * 0.28],
          ],
          0.035,
          dark,
        );
        if (animal.id === "reindeer")
          for (let i = 0; i < 3; i++)
            bone(
              [0.8 - i * 0.12, 1.95 + i * 0.2, sign * 0.2],
              [1.05 - i * 0.1, 2.25 + i * 0.2, sign * (0.25 + i * 0.1)],
              0.022,
              0.006,
              ivory,
            );
      }
    }
    if (animal.id === "walrus")
      for (const sign of [-1, 1])
        bone(
          [1.36, 0.7, sign * 0.16],
          [1.43, 0.15, sign * 0.18],
          0.06,
          0.01,
          ivory,
        );
    const tail = new THREE.Group();
    tail.position.set(-0.94, bodyY, 0);
    root.add(tail);
    moving.push(tail);
    if (fox) {
      const t = ball([-0.56, -0.2, 0], [0.68, 0.2, 0.21], skin, tail);
      t.rotation.z = 0.28;
      ball([-1.02, -0.34, 0], [0.25, 0.15, 0.15], pale, tail);
    } else if (!bear) {
      curve(
        [
          [0, 0, 0],
          [-0.36, -0.1, 0],
          [-0.57, -0.56, 0.06],
          [-0.75, -0.55, 0.13],
        ],
        otter ? 0.1 : 0.028,
        skin,
        tail,
      );
      if (animal.id === "lion")
        ball([-0.74, -0.55, 0.13], [0.1, 0.075, 0.075], dark, tail);
    }
  }
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  root.position.x = -center.x;
  root.position.y = aquatic ? 0.15 : -bounds.min.y;
  root.rotation.y = -0.3;
  return { root, moving, aquatic, dispose: () => map.dispose() };
}
