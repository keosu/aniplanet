import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createAnimal } from "./models";
import { imagePath, type Animal } from "./data";
import { usePreferences } from "./preferences";
export default function AnimalScene({
  animal,
  playing,
}: {
  animal: Animal;
  playing: boolean;
}) {
  const { preferences, t } = usePreferences();
  const host = useRef<HTMLDivElement>(null);
  const play = useRef(playing);
  play.current = playing;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = host.current;
    if (!el || !animal.shape) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const ocean = animal.habitat === "ocean",
      polar = animal.habitat === "polar",
      forest = animal.habitat === "forest";
    const bg = ocean
      ? "#153f4b"
      : polar
        ? "#9cafb1"
        : forest
          ? "#202f26"
          : "#554e3b";
    scene.background = new THREE.Color(bg);
    scene.fog = new THREE.FogExp2(bg, ocean ? 0.075 : 0.045);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(4.8, animal.shape === "giraffe" ? 3 : 2.6, 7);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, ocean ? 0.2 : 1, 0);
    controls.enableDamping = true;
    controls.minDistance = 3;
    controls.maxDistance = 12;
    controls.maxPolarAngle = ocean ? Math.PI : Math.PI / 2 - 0.035;
    controls.enablePan = false;
    scene.add(
      new THREE.HemisphereLight(
        ocean ? "#afedff" : "#e7ecd6",
        ocean ? "#19343a" : "#655342",
        1.8,
      ),
    );
    const sun = new THREE.DirectionalLight(polar ? "#f0f7ff" : "#fff2db", 3);
    sun.position.set(-3, 7, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -5;
    sun.shadow.camera.right = 5;
    sun.shadow.camera.top = 5;
    sun.shadow.camera.bottom = -5;
    sun.shadow.bias = -0.0004;
    sun.shadow.radius = 3;
    scene.add(sun);
    const back = new THREE.DirectionalLight("#8db9ac", 1.4);
    back.position.set(3, 3, -4);
    scene.add(back);
    const { root, moving, aquatic, dispose } = createAnimal(animal);
    scene.add(root);
    let seed = 43;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const terrain = document.createElement("canvas");
    terrain.width = 512;
    terrain.height = 512;
    const ctx = terrain.getContext("2d")!;
    ctx.fillStyle = ocean
      ? "#587d77"
      : polar
        ? "#cad6cf"
        : forest
          ? "#454735"
          : animal.habitat === "desert"
            ? "#b3a078"
            : "#706949";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 65000; i++) {
      ctx.fillStyle =
        random() > 0.5 ? "rgba(12,21,14,.12)" : "rgba(233,225,190,.1)";
      const size = random() * 3;
      ctx.fillRect(random() * 512, random() * 512, size, size);
    }
    const terrainMap = new THREE.CanvasTexture(terrain);
    terrainMap.colorSpace = THREE.SRGBColorSpace;
    terrainMap.wrapS = terrainMap.wrapT = THREE.RepeatWrapping;
    terrainMap.repeat.set(65, 65);
    const openOcean = ocean && !["ray", "turtle"].includes(animal.shape);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ map: terrainMap, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = aquatic ? (openOcean ? -9 : -2.5) : -0.015;
    ground.receiveShadow = true;
    scene.add(ground);
    if (ocean) {
      for (let i = 0; i < 5; i++) {
        const ray = new THREE.Mesh(
          new THREE.ConeGeometry(0.7 + random(), 12, 20, 1, true),
          new THREE.MeshBasicMaterial({
            color: "#78bcc4",
            transparent: true,
            opacity: 0.025,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
          }),
        );
        ray.position.set((i - 2) * 2.7, 2, -2 - i);
        ray.rotation.z = 0.24;
        scene.add(ray);
      }
    }
    const rockMat = new THREE.MeshStandardMaterial({
      color: polar ? "#bfcac5" : ocean ? "#4d6b61" : "#746d55",
      roughness: 1,
    });
    for (let i = 0; i < 28; i++) {
      const angle = random() * Math.PI * 2,
        distance = 3.4 + random() * 15;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.15 + random() * 0.5, 1),
        rockMat,
      );
      rock.position.set(
        Math.cos(angle) * distance,
        ground.position.y,
        Math.sin(angle) * distance,
      );
      rock.scale.set(1.5, 0.45 + random(), 1);
      rock.rotation.set(random(), random(), random());
      rock.castShadow = true;
      scene.add(rock);
    }
    if (!polar && animal.habitat !== "desert" && !openOcean) {
      const grassMat = new THREE.MeshStandardMaterial({
        color: ocean ? "#426e59" : forest ? "#5b6942" : "#9a9863",
        side: THREE.DoubleSide,
        roughness: 1,
      });
      const grassGeo = new THREE.ConeGeometry(0.04, ocean ? 0.65 : 0.38, 3);
      const grass = new THREE.InstancedMesh(grassGeo, grassMat, 750);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 750; i++) {
        const x = (random() - 0.5) * 26,
          z = (random() - 0.5) * 26;
        dummy.position.set(x, ground.position.y + 0.14, z);
        if (Math.abs(x) < 2.3 && Math.abs(z) < 1) dummy.position.y = -5;
        dummy.rotation.set(
          (random() - 0.5) * 0.5,
          random() * 6,
          (random() - 0.5) * 0.5,
        );
        dummy.scale.setScalar(0.6 + random() * 1.4);
        dummy.updateMatrix();
        grass.setMatrixAt(i, dummy.matrix);
      }
      scene.add(grass);
    }
    if (
      forest ||
      animal.habitat === "savanna" ||
      animal.habitat === "wetland"
    ) {
      const bark = new THREE.MeshStandardMaterial({
        color: "#494536",
        roughness: 1,
      });
      const leaves = new THREE.MeshStandardMaterial({
        color: forest ? "#304337" : "#50573c",
        roughness: 1,
      });
      for (let i = 0; i < 16; i++) {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.17, 3, 9),
          bark,
        );
        trunk.position.y = 1.5;
        tree.add(trunk);
        for (let j = 0; j < 8; j++) {
          const angle = j * 2.4;
          const x = Math.cos(angle) * (0.4 + random()),
            z = Math.sin(angle) * (0.4 + random());
          const branch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.028, 0.065, 1.6, 6),
            bark,
          );
          branch.position.set(x * 0.5, 2.35, z * 0.5);
          branch.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(x, 0.9, z).normalize(),
          );
          tree.add(branch);
          const crown = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.62 + random() * 0.33, 1),
            leaves,
          );
          crown.position.set(x, 2.9 + random() * 0.4, z);
          crown.scale.set(1.3, forest ? 1 : 0.45, 1.2);
          tree.add(crown);
        }
        tree.position.set((random() - 0.5) * 28, 0, -7 - random() * 15);
        tree.scale.setScalar(0.7 + random());
        scene.add(tree);
      }
    }
    const positions = new Float32Array(180 * 3);
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (random() - 0.5) * 18;
      positions[i + 1] = random() * 8;
      positions[i + 2] = (random() - 0.5) * 18;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: ocean ? "#b2e1d8" : polar ? "#ffffff" : "#decd9c",
        size: polar ? 0.035 : 0.02,
        transparent: true,
        opacity: 0.42,
      }),
    );
    scene.add(particles);
    const observer = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    observer.observe(el);
    let frame = 0,
      t = 0,
      last = performance.now(),
      lastRender = 0;
    const y = root.position.y;
    const restScale = root.scale.clone();
    const restRotation = root.rotation.clone();
    const movingRest = moving.map((part) => part.rotation.clone());
    function animate(now: number) {
      frame = requestAnimationFrame(animate);
      if (now - lastRender < 1000 / 30) return;
      lastRender = now;
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (document.hidden) return;
      if (play.current) {
        t += delta;
        root.position.y = y + (aquatic ? Math.sin(t * 1.1) * 0.065 : 0);
        root.scale.y = restScale.y * (1 + Math.sin(t * 1.6) * 0.009);
        root.scale.z = restScale.z * (1 + Math.sin(t * 1.6) * 0.006);
        root.rotation.z =
          restRotation.z + (aquatic ? Math.sin(t * 0.8) * 0.018 : 0);
        moving.forEach((obj, i) => {
          const axis =
            animal.shape === "shark"
              ? "y"
              : aquatic
                ? "z"
                : animal.shape === "bird" || animal.shape === "penguin"
                  ? "x"
                  : "y";
          obj.rotation[axis] =
            movingRest[i][axis] +
            Math.sin(t * (aquatic ? 1.8 : 1.3) + i * Math.PI) *
              (aquatic ? 0.09 : 0.1);
        });
        particles.rotation.y = t * 0.01;
      }
      controls.update();
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      dispose();
      terrainMap.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            m.dispose(),
          );
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [animal]);
  return (
    <div
      className="animal-canvas"
      ref={host}
      aria-label={
        preferences.language === "zh"
          ? `${animal.name}的可旋转三维示意模型`
          : `Interactive 3D schematic of ${animal.name}`
      }
    >
      {failed && (
        <div className="scene-fallback">
          <img src={imagePath(animal.id)} alt={animal.name} />
          <p>{t("此设备暂不支持 3D，仍可浏览物种资料与摄影。")}</p>
        </div>
      )}
    </div>
  );
}
