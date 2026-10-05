import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { animals, type Animal, type HabitatId } from "./data";
import { animalEmoji } from "./animalEmoji";
import { usePreferences } from "./preferences";
export interface GlobeHandle {
  zoom: (direction: number) => void;
  reset: () => void;
  focus: (animal: Animal) => void;
}
interface Props {
  active?: boolean;
  habitat: HabitatId;
  selected: Animal;
  onSelect: (a: Animal) => void;
  rotating: boolean;
  onInteract: () => void;
  scope?: "world" | "china";
  species?: Animal[];
}
const coordinates = (lat: number, lng: number, r = 1.82) =>
  new THREE.Vector3(
    r * Math.cos((lat * Math.PI) / 180) * Math.cos((lng * Math.PI) / 180),
    r * Math.sin((lat * Math.PI) / 180),
    -r * Math.cos((lat * Math.PI) / 180) * Math.sin((lng * Math.PI) / 180),
  );
export const Globe = forwardRef<GlobeHandle, Props>(function Globe(
  {
    habitat,
    selected,
    onSelect,
    rotating,
    onInteract,
    scope = "world",
    species,
    active = true,
  },
  ref,
) {
  const activeRef = useRef(active);
  activeRef.current = active;
  const { preferences, motionEnabled, t } = usePreferences();
  const localeRef = useRef(preferences.language);
  localeRef.current = preferences.language;
  const motionRef = useRef(motionEnabled);
  motionRef.current = motionEnabled;
  const container = useRef<HTMLDivElement>(null);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const markerRefs = useRef(new Map<string, HTMLButtonElement>());
  const groups = useRef(new Map<string, Animal[]>());
  const [expanded, setExpanded] = useState<Animal[] | null>(null);
  const selectedRef = useRef(selected.id);
  selectedRef.current = selected.id;
  const actions = useRef({ onSelect, onInteract });
  actions.current = { onSelect, onInteract };
  const api = useRef<{
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    earth: THREE.Group;
    desired: THREE.Vector3 | null;
  }>(null);
  const rotateRef = useRef(rotating);
  rotateRef.current = rotating;
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const pins =
    species ||
    animals.filter((a) => habitat === "all" || a.habitat === habitat);
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const pinIds = pins.map((a) => a.id).join("|");
  useEffect(
    () => setExpanded(null),
    [habitat, scope, pinIds, preferences.language],
  );
  const activate = (id: string) => {
    const group = groups.current.get(id);
    if (!group?.length) return;
    actions.current.onInteract();
    if (group.length > 1) setExpanded([...group]);
    else {
      setExpanded(null);
      actions.current.onSelect(group[0]);
    }
  };
  const activateRef = useRef(activate);
  activateRef.current = activate;
  useImperativeHandle(
    ref,
    () => ({
      zoom(direction) {
        const s = api.current;
        if (s) {
          s.desired = s.camera.position
            .clone()
            .multiplyScalar(direction > 0 ? 0.86 : 1.16)
            .clampLength(s.controls.minDistance, s.controls.maxDistance);
        }
      },
      reset() {
        const s = api.current;
        if (s) s.desired = new THREE.Vector3(0, 0.3, 5.7);
      },
      focus(animal) {
        const s = api.current;
        if (s) {
          s.earth.updateMatrixWorld();
          const site =
            scopeRef.current === "china" && animal.china
              ? animal.china
              : animal;
          s.desired = coordinates(site.lat, site.lng)
            .applyMatrix4(s.earth.matrixWorld)
            .normalize()
            .multiplyScalar(s.camera.position.length());
        }
      },
    }),
    [],
  );
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.3, 5.7);
    // Listen on the shared surface so gestures starting on an emoji also orbit.
    const controls = new OrbitControls(camera, el);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.045;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.65;
    controls.minDistance = 3.5;
    controls.maxDistance = 8;
    controls.autoRotateSpeed = 0.28;
    controls.rotateSpeed = 0.45;
    const earth = new THREE.Group();
    earth.rotation.y = -1.95;
    scene.add(earth);
    scene.add(new THREE.AmbientLight("#d4e8e4", 2.1));
    const sun = new THREE.DirectionalLight("#fff5df", 3.1);
    sun.position.set(-4, 3, 5);
    scene.add(sun);
    const rim = new THREE.DirectionalLight("#2c8cbe", 0.65);
    rim.position.set(3, -1, -2);
    scene.add(rim);
    const loader = new THREE.TextureLoader();
    const textures: THREE.Texture[] = [];
    const texture = (path: string, srgb = false) => {
      const t = loader.load(path, () => setLoaded(true));
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      textures.push(t);
      return t;
    };
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: texture("/images/earth.jpg", true),
      normalMap: texture("/images/earth-normal.jpg"),
      normalScale: new THREE.Vector2(0.35, 0.35),
      specularMap: texture("/images/earth-specular.jpg"),
      specular: new THREE.Color("#24546c"),
      shininess: 10,
    });
    earth.add(
      new THREE.Mesh(new THREE.SphereGeometry(1.8, 96, 64), earthMaterial),
    );
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.813, 80, 56),
      new THREE.MeshPhongMaterial({
        map: texture("/images/earth-clouds.png", true),
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
    );
    earth.add(clouds);
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.86, 64, 48),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        uniforms: {},
        vertexShader:
          "varying vec3 vNormal; varying vec3 vPosition; void main(){vNormal=normalize(normalMatrix*normal);vPosition=(modelViewMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*vec4(vPosition,1.0);}",
        fragmentShader:
          "varying vec3 vNormal;varying vec3 vPosition;void main(){float f=pow(1.0-abs(dot(normalize(vNormal),normalize(-vPosition))),3.0);gl_FragColor=vec4(0.15,0.5,0.72,f*0.6);}",
      }),
    );
    earth.add(atmosphere);
    const positions = new Float32Array(240 * 3);
    for (let i = 0; i < positions.length; i++) {
      positions[i] = Math.sin(i * 127.1 + 311.7) * 17;
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    scene.add(
      new THREE.Points(
        starsGeometry,
        new THREE.PointsMaterial({
          color: "#9db0ad",
          size: 0.012,
          transparent: true,
          opacity: 0.5,
        }),
      ),
    );
    api.current = { camera, controls, earth, desired: null };
    const interrupt = () => {
      if (api.current) api.current.desired = null;
      rotateRef.current = false;
      controls.autoRotate = false;
      actions.current.onInteract();
    };
    controls.addEventListener("start", interrupt);
    let gesture: {
      id: number;
      x: number;
      y: number;
      animal?: string;
      moved: boolean;
    } | null = null;
    const down = (event: PointerEvent) => {
      if (gesture) {
        gesture.moved = true;
        return;
      }
      const marker = (event.target as HTMLElement).closest<HTMLButtonElement>(
        ".map-pin",
      );
      gesture = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        animal: marker?.dataset.animal,
        moved: false,
      };
      setExpanded(null);
    };
    const move = (event: PointerEvent) => {
      if (
        gesture &&
        Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6
      )
        gesture.moved = true;
    };
    const up = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.id) return;
      if (!gesture.moved && gesture.animal) activateRef.current(gesture.animal);
      gesture = null;
    };
    const cancel = () => {
      gesture = null;
    };
    const key = (event: KeyboardEvent) => {
      if (
        event.target !== el ||
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        return;
      event.preventDefault();
      interrupt();
      const spherical = new THREE.Spherical().setFromVector3(camera.position);
      spherical.theta +=
        event.key === "ArrowLeft"
          ? -0.18
          : event.key === "ArrowRight"
            ? 0.18
            : 0;
      spherical.phi +=
        event.key === "ArrowUp" ? -0.18 : event.key === "ArrowDown" ? 0.18 : 0;
      spherical.makeSafe();
      api.current!.desired = new THREE.Vector3().setFromSpherical(spherical);
    };
    el.addEventListener("pointerdown", down, true);
    el.addEventListener("pointermove", move, true);
    el.addEventListener("pointerup", up, true);
    el.addEventListener("pointercancel", cancel, true);
    el.addEventListener("keydown", key);
    let fitDistance = 5.7;
    const observer = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      const halfFov = Math.atan(
        Math.tan(THREE.MathUtils.degToRad(21)) * Math.min(1, camera.aspect),
      );
      const nextFit = Math.max(5.7, (1.86 / Math.sin(halfFov)) * 1.07);
      camera.position.multiplyScalar(nextFit / fitDistance);
      api.current?.desired?.multiplyScalar(nextFit / fitDistance);
      controls.maxDistance = Math.max(10, nextFit * 1.7);
      fitDistance = nextFit;
    });
    observer.observe(el);
    let frame = 0;
    let disposed = false;
    function animate() {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      if (document.hidden || !activeRef.current) return;
      const state = api.current!;
      if (state.desired) {
        camera.position.lerp(state.desired, motionRef.current ? 0.065 : 1);
        if (camera.position.distanceTo(state.desired) < 0.008)
          state.desired = null;
      }
      controls.autoRotate =
        rotateRef.current && motionRef.current && !state.desired;
      controls.update();
      if (motionRef.current) clouds.rotation.y += 0.000025;
      earth.updateMatrixWorld();
      const width = el!.clientWidth,
        height = el!.clientHeight;
      const visiblePins: {
        animal: Animal;
        x: number;
        y: number;
      }[] = [];
      for (const animal of pinsRef.current) {
        const marker = markerRefs.current.get(animal.id);
        if (!marker) continue;
        const site =
          scopeRef.current === "china" && animal.china ? animal.china : animal;
        const point = coordinates(site.lat, site.lng).applyMatrix4(
          earth.matrixWorld,
        );
        const visible =
          point
            .clone()
            .normalize()
            .dot(camera.position.clone().sub(point).normalize()) > 0.12;
        const projected = point.project(camera);
        marker.style.visibility = "hidden";
        marker.tabIndex = -1;
        const x = (projected.x * 0.5 + 0.5) * width;
        const y = (-projected.y * 0.5 + 0.5) * height;
        if (visible && x > 22 && x < width - 22 && y > 22 && y < height - 45)
          visiblePins.push({ animal, x, y });
      }
      // Keep the selected species as the anchor; group neighbours in screen space.
      visiblePins.sort(
        (a, b) =>
          Number(b.animal.id === selectedRef.current) -
          Number(a.animal.id === selectedRef.current),
      );
      const anchors: typeof visiblePins = [];
      groups.current.clear();
      for (const pin of visiblePins) {
        const near = anchors.find(
          (a) => Math.hypot(a.x - pin.x, a.y - pin.y) < 54,
        );
        if (near) groups.current.get(near.animal.id)!.push(pin.animal);
        else {
          anchors.push(pin);
          groups.current.set(pin.animal.id, [pin.animal]);
        }
      }
      for (const { animal, x, y } of anchors) {
        const marker = markerRefs.current.get(animal.id)!;
        const count = groups.current.get(animal.id)!.length;
        marker.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
        marker.style.visibility = "visible";
        marker.tabIndex = 0;
        marker.setAttribute(
          "aria-label",
          localeRef.current === "en"
            ? count > 1
              ? `${count} animals near ${animal.name}`
              : `Explore ${animal.name}, ${animal.region}`
            : count > 1
              ? `${animal.name}附近的 ${count} 种动物`
              : `探索${animal.name}，${animal.region}`,
        );
        const badge = marker.querySelector<HTMLElement>(".pin-count")!;
        badge.textContent = count > 1 ? `+${count - 1}` : "";
      }
      renderer.render(scene, camera);
    }
    animate();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener("start", interrupt);
      el.removeEventListener("pointerdown", down, true);
      el.removeEventListener("pointermove", move, true);
      el.removeEventListener("pointerup", up, true);
      el.removeEventListener("pointercancel", cancel, true);
      el.removeEventListener("keydown", key);
      controls.dispose();
      textures.forEach((t) => t.dispose());
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
  }, []);
  return (
    <>
      <div
        className="globe-canvas"
        ref={container}
        aria-label={t("可拖动旋转的三维地球")}
        tabIndex={0}
        role="group"
        aria-describedby="globe-help"
      >
        {failed ? (
          <div className="globe-fallback">
            <img src="/images/earth.jpg" alt={t("地球表面纹理")} />
            <span>{t("当前设备不支持 WebGL，请从物种列表选择。")}</span>
          </div>
        ) : (
          <>
            {!loaded && (
              <div className="globe-loading">
                <span />
                {t("加载地球…")}
              </div>
            )}
            <div className="globe-markers">
              {pins.map((a) => (
                <button
                  key={a.id}
                  ref={(el) => {
                    if (el) markerRefs.current.set(a.id, el);
                    else markerRefs.current.delete(a.id);
                  }}
                  className={`map-pin ${selected.id === a.id ? "selected" : ""}`}
                  data-animal={a.id}
                  onClick={(event) => {
                    if (event.detail === 0) activate(a.id);
                  }}
                  aria-label={
                    preferences.language === "zh"
                      ? `探索${a.name}，${a.region}`
                      : `Explore ${a.name}, ${a.region}`
                  }
                >
                  <span className="pin-emoji" aria-hidden="true">
                    {animalEmoji(a)}
                  </span>
                  <span className="pin-count" aria-hidden="true" />
                  <span className="pin-label">{a.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {expanded && (
        <div className="globe-species-group" aria-label={t("此区域的动物")}>
          <div className="globe-group-heading">
            <span>
              {t("区域物种 ·")}
              {expanded.length}
            </span>
            <button
              aria-label={t("关闭区域动物")}
              onClick={() => setExpanded(null)}
            >
              ×
            </button>
          </div>
          <div className="globe-group-list">
            {expanded.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  onSelect(a);
                  setExpanded(null);
                }}
              >
                <span aria-hidden="true">{animalEmoji(a)}</span>
                <span>
                  {a.name}
                  <small>
                    {scope === "china" && a.china ? a.china.region : a.region}
                  </small>
                </span>
                <span>↗</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
});
