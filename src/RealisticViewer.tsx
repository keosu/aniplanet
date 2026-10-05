import { useEffect, useRef, useState } from "react";
import Sketchfab, {
  type ViewerAPI,
  type Animation,
} from "@sketchfab/viewer-api";
import {
  ArrowUpRight,
  Pause,
  Play,
  RotateCcw,
  Plus,
  Minus,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { Animal } from "./data";
import { imagePath } from "./data";
import type { RealisticModel } from "./realisticModels";
import { usePreferences } from "./preferences";
type Clip = {
  uid: string;
  label: string;
  name: string;
};
const clipRules: [string, RegExp][] = [
  ["自然状态", /idle|breath|stand.*(idle|normal)|rest/i],
  ["行走", /(^|[^a-z])walk([^a-z]|$)/i],
  ["游动", /swim/i],
  ["进食", /eat|graz|feed/i],
];
function pickClips(animations: Animation[], aquatic: boolean): Clip[] {
  const clips: Clip[] = [];
  for (const [label, pattern] of clipRules) {
    if (label === "游动" && !aquatic) continue;
    if (label === "行走" && aquatic) continue;
    const clip = animations.find(
      (a) =>
        pattern.test(a[1]) &&
        !/back|turn|attack|death|dead|hurt|fast|baby|cub|female/i.test(a[1]),
    );
    if (clip && !clips.some((c) => c.uid === clip[0]))
      clips.push({ uid: clip[0], name: clip[1], label });
  }
  if (!clips.length && animations[0])
    clips.push({
      uid: animations[0][0],
      name: animations[0][1],
      label: "自然动作",
    });
  return clips.slice(0, 3);
}
export default function RealisticViewer({
  animal,
  model,
  playing,
  onPlayingChange,
  onFallback,
}: {
  animal: Animal;
  model: RealisticModel;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  onFallback: () => void;
}) {
  const { preferences, motionEnabled, t } = usePreferences();
  const iframe = useRef<HTMLIFrameElement>(null);
  const apiRef = useRef<ViewerAPI | null>(null);
  const focusTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playRef = useRef(playing);
  playRef.current = playing;
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeClip, setActiveClip] = useState("");
  const [hardwareError, setHardwareError] = useState(false);
  function frameAnimal(api: ViewerAPI) {
    focusTimers.current.forEach(clearTimeout);
    focusTimers.current = [
      setTimeout(() => {
        if (apiRef.current !== api) return;
        // Fit after the selected animation updates its skeleton and world scale.
        api.focusOnVisibleGeometries(() => {
          if (apiRef.current !== api) return;
          focusTimers.current.push(
            setTimeout(() => {
              if (apiRef.current !== api) return;
              api.getCameraLookAt((error, camera) => {
                if (apiRef.current !== api) return;
                if (error) {
                  setStatus("ready");
                  return;
                }
                const padding =
                  animal.habitat === "ocean"
                    ? 1.45
                    : animal.id === "giraffe"
                      ? 1.15
                      : 0.85;
                api.setCameraLookAt(
                  camera.position.map(
                    (value, index) =>
                      camera.target[index] +
                      (value - camera.target[index]) * padding,
                  ),
                  camera.target,
                  0.25,
                  () => {
                    if (apiRef.current === api) setStatus("ready");
                  },
                );
              });
            }, 1000),
          );
        });
      }, 1200),
    ];
  }
  useEffect(() => {
    const frame = iframe.current;
    if (!frame) return;
    let disposed = false;
    let readyCallback: (() => void) | undefined;
    let currentApi: ViewerAPI | null = null;
    setStatus("loading");
    setSlow(false);
    setClips([]);
    setActiveClip("");
    setHardwareError(false);
    const slowTimer = setTimeout(() => {
      if (!disposed) setSlow(true);
    }, 12000);
    const failureTimer = setTimeout(() => {
      if (!disposed && !apiRef.current) setStatus("error");
    }, 60000);
    const client = new Sketchfab("1.12.1", frame);
    client.init(model.uid, {
      autostart: 1,
      preload: 1,
      transparent: 1,
      ui_theme: "dark",
      ui_infos: 0,
      ui_hint: 0,
      ui_inspector: 0,
      ui_help: 0,
      ui_settings: 0,
      ui_vr: 0,
      ui_ar: 0,
      ui_animations: 0,
      ui_stop: 0,
      ui_controls: 0,
      success(api) {
        if (disposed) return;
        currentApi = api;
        readyCallback = () => {
          if (disposed) return;
          clearTimeout(slowTimer);
          clearTimeout(failureTimer);
          apiRef.current = api;
          setSlow(false);
          api.setEnvironment({ backgroundEnable: false });
          api.getAnimations((error, animations) => {
            if (disposed) return;
            if (error) {
              frameAnimal(api);
              return;
            }
            const choices = pickClips(animations, animal.habitat === "ocean");
            setClips(choices);
            if (choices[0]) {
              setActiveClip(choices[0].uid);
              api.setCurrentAnimationByUID(choices[0].uid, () => {
                if (disposed) return;
                api.setCycleMode("loop_one");
                api.seekTo(0, () => {
                  if (disposed) return;
                  if (playRef.current) api.play();
                  else api.pause();
                  frameAnimal(api);
                });
              });
            } else frameAnimal(api);
          });
        };
        api.addEventListener("viewerready", readyCallback);
        api.start();
      },
      error(error) {
        if (!disposed) {
          clearTimeout(slowTimer);
          clearTimeout(failureTimer);
          setHardwareError(/webgl|hardware/i.test(String(error)));
          setStatus("error");
        }
      },
    });
    return () => {
      disposed = true;
      clearTimeout(slowTimer);
      clearTimeout(failureTimer);
      focusTimers.current.forEach(clearTimeout);
      focusTimers.current = [];
      apiRef.current = null;
      if (currentApi) {
        if (readyCallback)
          currentApi.removeEventListener("viewerready", readyCallback);
        currentApi.pause();
        currentApi.stop();
      }
      // The SDK has no public destroy method; unregister its two window listeners.
      if (client._initializeAPIEmbedBinded)
        window.removeEventListener("message", client._initializeAPIEmbedBinded);
      if (client._client?._serverReceiveMessageBinded)
        window.removeEventListener(
          "message",
          client._client._serverReceiveMessageBinded,
        );
      const registry = window as Window & {
        sketchfabAPIinstances?: Sketchfab[];
      };
      if (registry.sketchfabAPIinstances)
        registry.sketchfabAPIinstances = registry.sketchfabAPIinstances.filter(
          (instance) => instance !== client,
        );
      frame.src = "about:blank";
    };
  }, [model.uid, attempt]);
  useEffect(() => {
    const api = apiRef.current;
    if (!api || status !== "ready") return;
    if (playing) api.play();
    else api.pause();
  }, [playing, status]);
  function choose(clip: Clip) {
    const api = apiRef.current;
    if (!api) return;
    setActiveClip(clip.uid);
    api.setCurrentAnimationByUID(clip.uid, () => {
      if (apiRef.current !== api) return;
      api.seekTo(0, () => {
        if (apiRef.current !== api) return;
        if (playRef.current) api.play();
        else api.pause();
        frameAnimal(api);
      });
    });
  }
  function zoom(factor: number) {
    const api = apiRef.current;
    if (!api) return;
    api.getCameraLookAt((error, camera) => {
      if (error || apiRef.current !== api) return;
      api.setCameraLookAt(
        camera.position.map(
          (value, index) =>
            camera.target[index] + (value - camera.target[index]) * factor,
        ),
        camera.target,
        0.2,
      );
    });
  }
  return (
    <div
      className={`realistic-viewer model-${status}`}
      data-model-status={status}
      data-model-uid={model.uid}
      data-active-animation={
        clips.find((c) => c.uid === activeClip)?.name || ""
      }
    >
      <div
        className="realistic-backdrop"
        style={{
          backgroundImage: `linear-gradient(180deg,${animal.habitat === "ocean" ? "#164657ef,#051d2afa" : "#0a171a91,#0b171cf0"}),url(${imagePath(animal.habitat)})`,
        }}
      />
      <span className="model-quality">
        <Wifi size={11} />
        {t("在线 · 写实模型")}
      </span>
      <iframe
        ref={iframe}
        title={
          preferences.language === "zh"
            ? `${animal.name}的写实 3D 模型`
            : `Realistic 3D model of ${animal.name}`
        }
        allow="autoplay; fullscreen; xr-spatial-tracking"
        allowFullScreen
        tabIndex={status === "ready" ? 0 : -1}
        onError={() => setStatus("error")}
      />
      {status !== "ready" && (
        <div className="model-loading-panel" aria-live="polite">
          <img src={imagePath(animal.id)} alt="" />
          <div className="model-loading-shade" />
          <div className="model-loading-content">
            {status === "error" ? (
              <WifiOff size={26} />
            ) : (
              <span className="model-spinner" />
            )}
            <h3>
              {status === "error"
                ? hardwareError
                  ? t("当前浏览器需要开启图形加速")
                  : t("写实模型暂时无法连接")
                : slow
                  ? t("精细纹理正在加载")
                  : t("正在走近真实的它")}
            </h3>
            <p>
              {status === "error"
                ? hardwareError
                  ? t(
                      "开启浏览器图形加速后可查看精细模型，也可以先查看本地摄影。",
                    )
                  : t("请检查网络连接，或切换到本地内容继续探索。")
                : slow
                  ? t("首次加载需要一点时间，你也可以先查看本地内容。")
                  : t("加载动物模型、皮肤纹理与骨骼动画")}
            </p>
            {(slow || status === "error") && (
              <div className="model-loading-actions">
                {status === "error" && (
                  <button onClick={() => setAttempt((n) => n + 1)}>
                    <RotateCcw size={13} />
                    {t("重新加载")}
                  </button>
                )}
                <button onClick={onFallback}>
                  {t("查看本地摄影")}
                  <ArrowUpRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="model-credit">
        <span>
          3D ©{" "}
          <a href={model.authorUrl} target="_blank" rel="noreferrer">
            {model.author}
          </a>
          {model.variant && ` · ${t(model.variant)}`}
        </span>
        <a href={model.url} target="_blank" rel="noreferrer">
          {t("原作与来源")}
          <ArrowUpRight size={11} />
        </a>
      </div>
      <div className="model-control-bar">
        <div className="model-clips">
          {clips.map((clip) => (
            <button
              key={clip.uid}
              className={activeClip === clip.uid ? "active" : ""}
              onClick={() => choose(clip)}
            >
              {t(clip.label)}
            </button>
          ))}
          {!clips.length && (
            <span>
              {status === "ready"
                ? t("拖动环绕 · 滚轮缩放")
                : t("首次加载需联网")}
            </span>
          )}
        </div>
        <div className="model-camera-controls">
          <button
            className="round-button"
            disabled={status !== "ready"}
            onClick={() => zoom(0.8)}
            aria-label={t("放大动物模型")}
          >
            <Plus size={15} />
          </button>
          <button
            className="round-button"
            disabled={status !== "ready"}
            onClick={() => zoom(1.25)}
            aria-label={t("缩小动物模型")}
          >
            <Minus size={15} />
          </button>
          <button
            className="round-button"
            disabled={status !== "ready" || !clips.length || !motionEnabled}
            onClick={() => onPlayingChange(!playing)}
            aria-label={playing ? t("暂停动物动画") : t("播放动物动画")}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
