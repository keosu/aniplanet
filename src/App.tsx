import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Settings2,
  List,
  MapPin,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { Globe, type GlobeHandle } from "./Globe";
import {
  animals,
  habitats,
  imagePath,
  statusColor,
  type Animal,
  type HabitatId,
} from "./data";
import { animalEmoji } from "./animalEmoji";
import { realisticModels } from "./realisticModels";
import { ModelDownloads } from "./ModelDownloads";
import { Settings } from "./Settings";
import { SpeechButton } from "./SpeechButton";
import { usePreferences } from "./preferences";
import { localizeAnimal } from "./localizeAnimal";
import { assetPath } from "./assets";
import { Capacitor } from "@capacitor/core";
import { App as NativeApp } from "@capacitor/app";
const AnimalScene = lazy(() => import("./AnimalScene"));
const RealisticViewer = lazy(() => import("./RealisticViewer"));
type Credit = {
  id: string;
  source: string;
  artist?: string;
  license?: string;
};
const chinaCount = animals.filter((a) => a.china).length;
const searchIndex = new Map(
  animals.map((animal) => {
    const english = localizeAnimal(animal, "en");
    return [
      animal.id,
      `${animal.name} ${animal.english} ${animal.latin} ${animal.region} ${animal.china?.region || ""} ${english.region} ${english.china?.region || ""}`.toLowerCase(),
    ];
  }),
);
const chinaFeatured = [
  "panda",
  "snow-leopard",
  "golden-snub-nosed-monkey",
  "tibetan-antelope",
  "asian-elephant",
  "crested-ibis",
  "yangtze-finless-porpoise",
  "chinese-alligator",
  "tiger",
  "wild-yak",
];
const habitatLabels: Record<HabitatId, string> = {
  all: "全部",
  forest: "森林",
  savanna: "草原",
  mountain: "高山",
  wetland: "湿地",
  ocean: "海洋",
  desert: "荒漠",
  polar: "极地",
};
function Dialog({
  children,
  onClose,
  label,
  compact = false,
  returnFocus,
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
  compact?: boolean;
  returnFocus?: HTMLElement | null;
}) {
  const host = useRef<HTMLDivElement>(null),
    callback = useRef(onClose);
  callback.current = onClose;
  useEffect(() => {
    const previous =
      returnFocus || (document.activeElement as HTMLElement | null);
    host.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        callback.current();
      }
      if (e.key !== "Tab") return;
      const nodes = [
        ...(host.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input, select, [tabindex="0"]',
        ) || []),
      ].filter((el) => el.getClientRects().length);
      if (
        e.shiftKey &&
        (document.activeElement === nodes[0] ||
          document.activeElement === host.current)
      ) {
        e.preventDefault();
        nodes.at(-1)?.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === nodes.at(-1) ||
          document.activeElement === host.current)
      ) {
        e.preventDefault();
        nodes[0]?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      queueMicrotask(() => {
        if (previous?.isConnected && !previous.closest("[inert]"))
          previous.focus();
      });
    };
  }, []);
  return (
    <div
      className="dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={host}
        className={`app-dialog ${compact ? "compact-dialog" : ""}`}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}
function Status({ animal }: { animal: Animal }) {
  return (
    <span
      className="status-tag"
      style={{ color: statusColor(animal.statusCode) }}
    >
      <i />
      {animal.status} · {animal.statusCode}
    </span>
  );
}
export default function App() {
  const { preferences, motionEnabled, t } = usePreferences();
  const catalog = useMemo(
    () => animals.map((animal) => localizeAnimal(animal, preferences.language)),
    [preferences.language],
  );
  const [scope, setScope] = useState<"world" | "china">("china");
  const [habitat, setHabitat] = useState<HabitatId>("all");
  const [selectedId, setSelectedId] = useState("panda");
  const selected = catalog.find((a) => a.id === selectedId)!;
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(0),
    [pageSize, setPageSize] = useState(7);
  const [catalogOpen, setCatalogOpen] = useState(false),
    [rotating, setRotating] = useState(false);
  const [modal, setModal] = useState<"animal" | "settings" | null>(null);
  const [view, setView] = useState<"photo" | "simple" | "online">("photo");
  const [detailTab, setDetailTab] = useState<"info" | "download" | "source">(
    "info",
  );
  const [playing, setPlaying] = useState(true),
    [credits, setCredits] = useState<Credit[]>([]);
  const [creditError, setCreditError] = useState(false),
    [toast, setToast] = useState("");
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem("wild-atlas-saved") || "[]");
      return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  });
  const globe = useRef<GlobeHandle>(null),
    app = useRef<HTMLDivElement>(null),
    listSpace = useRef<HTMLDivElement>(null),
    search = useRef<HTMLInputElement>(null);
  const modalOpener = useRef<HTMLElement | null>(null);
  function openModal(next: "animal" | "settings") {
    modalOpener.current = document.activeElement as HTMLElement | null;
    setModal(next);
  }
  const backAction = useRef(() => {});
  backAction.current = () => {
    if (modal) setModal(null);
    else if (catalogOpen) setCatalogOpen(false);
    else void NativeApp.exitApp();
  };
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = NativeApp.addListener("backButton", () =>
      backAction.current(),
    );
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);
  useEffect(() => {
    if (!motionEnabled) {
      setPlaying(false);
      setRotating(false);
    }
  }, [motionEnabled]);
  useEffect(() => {
    try {
      localStorage.setItem("wild-atlas-saved", JSON.stringify(saved));
    } catch {
      /* Optional storage. */
    }
  }, [saved]);
  useEffect(() => {
    globe.current?.focus(selected);
  }, [selected.id, scope]);
  useEffect(() => {
    setPage(0);
  }, [scope, habitat, query, savedOnly, sort, pageSize]);
  useEffect(() => {
    const el = listSpace.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (el.clientHeight)
        setPageSize(
          Math.max(
            1,
            Math.floor(
              el.clientHeight /
                (parseFloat(
                  getComputedStyle(el).getPropertyValue("--species-row-height"),
                ) || 65),
            ),
          ),
        );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [preferences.fontSize, preferences.language]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "/" && !modal && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setCatalogOpen(true);
        setTimeout(() => search.current?.focus(), 50);
      }
      if (e.key === "Escape" && !modal) setCatalogOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [modal]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (detailTab !== "source" || credits.length) return;
    const c = new AbortController();
    fetch(assetPath("image-credits.json"), { signal: c.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setCredits)
      .catch((e) => {
        if (e.name !== "AbortError") setCreditError(true);
      });
    return () => c.abort();
  }, [detailTab, credits.length]);
  const term = query.trim().toLowerCase();
  const filtered = catalog.filter(
    (a) =>
      (scope === "world" || a.china) &&
      (habitat === "all" || a.habitat === habitat) &&
      (!savedOnly || saved.includes(a.id)) &&
      searchIndex.get(a.id)!.includes(term),
  );
  if (scope === "china" && sort === "default")
    filtered.sort(
      (a, b) =>
        (chinaFeatured.includes(a.id) ? chinaFeatured.indexOf(a.id) : 100) -
        (chinaFeatured.includes(b.id) ? chinaFeatured.indexOf(b.id) : 100),
    );
  if (sort === "name")
    filtered.sort((a, b) => a.name.localeCompare(b.name, preferences.language));
  if (sort === "threat")
    filtered.sort(
      (a, b) =>
        ["CR", "EN", "VU", "NT", "LC", "DD"].indexOf(a.statusCode) -
        ["CR", "EN", "VU", "NT", "LC", "DD"].indexOf(b.statusCode),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)),
    currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const location =
    scope === "china" && selected.china
      ? selected.china.region
      : selected.region;
  const credit = credits.find((c) => c.id === selected.id),
    model = realisticModels[selected.id];
  function choose(a: Animal) {
    setSelectedId(a.id);
    setRotating(false);
    setCatalogOpen(false);
  }
  function changeScope(next: "world" | "china") {
    setScope(next);
    setHabitat("all");
    setQuery("");
    setRotating(false);
    if (next === "china" && !selected.china) setSelectedId("panda");
  }
  function openAnimal() {
    setView("photo");
    setDetailTab("info");
    setPlaying(motionEnabled);
    openModal("animal");
  }
  function save() {
    setSaved((s) =>
      s.includes(selected.id)
        ? s.filter((id) => id !== selected.id)
        : [...s, selected.id],
    );
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await app.current?.requestFullscreen();
    } catch {
      setToast(t("当前浏览器不支持全屏"));
    }
  }
  return (
    <div className="atlas-app" ref={app}>
      <div className="app-chrome" inert={modal !== null}>
        <header className="app-header">
          <a
            className="app-brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              changeScope("china");
            }}
            aria-label={t("野境首页")}
          >
            <span className="brand-mark">W</span>
            <strong>
              {t("野境")}
              <small>WILD ATLAS</small>
            </strong>
          </a>
          <div className="scope-switch" aria-label={t("探索区域")}>
            <button
              className={scope === "world" ? "active" : ""}
              aria-pressed={scope === "world"}
              onClick={() => changeScope("world")}
            >
              <Globe2 size={14} />
              {t("全球")}
              <small>{animals.length}</small>
            </button>
            <button
              className={scope === "china" ? "active" : ""}
              aria-pressed={scope === "china"}
              onClick={() => changeScope("china")}
            >
              <MapPin size={14} />
              {t("中国")}
              <small>{chinaCount}</small>
            </button>
          </div>
          <div className="header-actions">
            <button
              className={`icon-button mobile-list ${catalogOpen ? "active" : ""}`}
              aria-label={t("打开物种列表")}
              onClick={() => setCatalogOpen((v) => !v)}
            >
              <List size={19} />
            </button>
            <button
              className={`icon-button ${savedOnly ? "active" : ""}`}
              aria-label={t("只看收藏")}
              aria-pressed={savedOnly}
              onClick={() => {
                setSavedOnly((v) => !v);
                setCatalogOpen(true);
              }}
            >
              <Bookmark size={17} fill={savedOnly ? "currentColor" : "none"} />
            </button>
            <button
              className="icon-button"
              aria-label={t("设置与说明")}
              title={t("设置与说明")}
              onClick={() => openModal("settings")}
            >
              <Settings2 size={19} />
            </button>
          </div>
        </header>
        <main className="app-workspace">
          {catalogOpen && (
            <button
              className="catalog-scrim"
              aria-label={t("收起物种列表")}
              onClick={() => setCatalogOpen(false)}
            />
          )}
          <aside
            className={`catalog-pane ${catalogOpen ? "is-open" : ""}`}
            aria-label={t("物种列表")}
          >
            <div className="catalog-heading">
              <h1>
                {savedOnly
                  ? t("我的收藏")
                  : scope === "china"
                    ? t("中国物种")
                    : t("全球物种")}
                <span>{filtered.length}</span>
              </h1>
              <button
                className="icon-button mobile-list"
                aria-label={t("关闭物种列表")}
                onClick={() => setCatalogOpen(false)}
              >
                <X size={17} />
              </button>
              <span className="catalog-label">SPECIES</span>
            </div>
            <label className="catalog-search">
              <Search size={15} />
              <input
                ref={search}
                aria-label={t("搜索物种")}
                placeholder={t("物种、学名、地区")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query ? (
                <button aria-label={t("清空搜索")} onClick={() => setQuery("")}>
                  <X size={14} />
                </button>
              ) : (
                <kbd>/</kbd>
              )}
            </label>
            <div className="habitat-filters" aria-label={t("生境筛选")}>
              {(["all", ...habitats.map((h) => h.id)] as HabitatId[]).map(
                (id) => (
                  <button
                    key={id}
                    aria-pressed={habitat === id}
                    className={habitat === id ? "active" : ""}
                    onClick={() => setHabitat(id)}
                  >
                    {t(habitatLabels[id])}
                  </button>
                ),
              )}
            </div>
            <div className="list-toolbar">
              <span>{savedOnly ? t("已收藏") : t("全部物种")}</span>
              <select
                aria-label={t("物种排序")}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="default">{t("默认排序")}</option>
                <option value="name">{t("名称排序")}</option>
                <option value="threat">{t("保护等级")}</option>
              </select>
            </div>
            <div className="species-list" ref={listSpace}>
              {visible.map((a) => (
                <button
                  key={a.id}
                  className={`species-row ${a.id === selected.id ? "selected" : ""}`}
                  aria-label={
                    preferences.language === "zh"
                      ? `选择${a.name}`
                      : `Select ${a.name}`
                  }
                  aria-pressed={a.id === selected.id}
                  onClick={() => choose(a)}
                >
                  <img
                    src={imagePath(a.id)}
                    alt=""
                    style={{ objectPosition: a.imagePosition }}
                  />
                  <span className="species-row-text">
                    <strong>{a.name}</strong>
                    <small>
                      {t(habitatLabels[a.habitat])} · {a.status}
                    </small>
                  </span>
                  <span className="row-symbol">
                    {realisticModels[a.id] ? "3D" : animalEmoji(a)}
                  </span>
                </button>
              ))}
              {!filtered.length && (
                <div className="empty-results">
                  <Search size={23} />
                  <span>{t("没有匹配物种")}</span>
                  <button
                    onClick={() => {
                      setQuery("");
                      setHabitat("all");
                      setSavedOnly(false);
                    }}
                  >
                    {t("清除筛选")}
                  </button>
                </div>
              )}
            </div>
            <div className="pagination">
              <span>
                {filtered.length ? currentPage * pageSize + 1 : 0}–
                {Math.min((currentPage + 1) * pageSize, filtered.length)} /{" "}
                {filtered.length}
              </span>
              <div>
                <button
                  aria-label={t("上一页物种")}
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <span>
                  {currentPage + 1} / {pages}
                </span>
                <button
                  aria-label={t("下一页物种")}
                  disabled={currentPage === pages - 1}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </aside>
          <div className="globe-stage">
            <Globe
              active={modal === null}
              ref={globe}
              selected={selected}
              habitat={habitat}
              scope={scope}
              species={filtered}
              rotating={rotating}
              onInteract={() => setRotating(false)}
              onSelect={choose}
            />
            <div className="globe-view-label">
              <span className="live-dot" />
              {scope === "china" ? t("中国境内") : t("全球分布")}
              <small>
                {filtered.length}
                {preferences.language === "en" ? " " : ""}
                {t("种")}
              </small>
            </div>
          </div>
          <aside className="selection-card" aria-label={t("已选物种")}>
            <button
              className="selection-photo"
              aria-label={
                preferences.language === "zh"
                  ? `查看${selected.name}详情`
                  : `View ${selected.name} details`
              }
              onClick={openAnimal}
            >
              <img
                src={imagePath(selected.id)}
                alt={selected.name}
                style={{ objectPosition: selected.imagePosition }}
              />
              <span>{t(habitatLabels[selected.habitat])}</span>
            </button>
            <div className="selection-content">
              <div className="selection-title">
                <h2>{selected.name}</h2>
                <button
                  className={`icon-button ${saved.includes(selected.id) ? "active" : ""}`}
                  aria-label={
                    saved.includes(selected.id)
                      ? t("取消收藏动物")
                      : t("收藏动物")
                  }
                  onClick={save}
                >
                  <Bookmark
                    size={16}
                    fill={saved.includes(selected.id) ? "currentColor" : "none"}
                  />
                </button>
              </div>
              <i className="selection-latin">{selected.latin}</i>
              <Status animal={selected} />
              <p className="selection-location">
                <MapPin size={12} />
                {location}
              </p>
              <button className="primary-button" onClick={openAnimal}>
                {t("查看详情")}
                <ArrowUpRight size={16} />
              </button>
            </div>
          </aside>
          <div className="map-tools">
            <button
              aria-label={rotating ? t("暂停地球自转") : t("开启地球自转")}
              aria-pressed={rotating}
              disabled={!motionEnabled}
              onClick={() => setRotating((v) => !v)}
            >
              {rotating ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <i />
            <button
              aria-label={t("放大地球")}
              onClick={() => globe.current?.zoom(1)}
            >
              <Plus size={18} />
            </button>
            <button
              aria-label={t("缩小地球")}
              onClick={() => globe.current?.zoom(-1)}
            >
              <Minus size={18} />
            </button>
            <button
              aria-label={t("重置地球视角")}
              onClick={() => {
                setRotating(false);
                globe.current?.focus(selected);
              }}
            >
              <RotateCcw size={16} />
            </button>
            <button
              className="fullscreen-button"
              aria-label={t("全屏")}
              onClick={() => void fullscreen()}
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </main>
        <span className="sr-only" id="globe-help">
          {t("拖动旋转 · 滚轮 / 双指缩放 · 点击动物")}
        </span>
      </div>
      {modal === "animal" && (
        <Dialog
          returnFocus={modalOpener.current}
          onClose={() => setModal(null)}
          label={
            preferences.language === "zh"
              ? `${selected.name}的物种详情`
              : `${selected.name} details`
          }
        >
          <div className="dialog-heading">
            <span>
              {animalEmoji(selected)} <strong>{selected.name}</strong>
              <small>{t(habitatLabels[selected.habitat])}</small>
            </span>
            <button
              className="icon-button"
              aria-label={t("关闭物种详情")}
              onClick={() => setModal(null)}
            >
              <X size={19} />
            </button>
          </div>
          <div className="detail-main">
            <div
              className={`detail-stage animal-viewer ${view === "online" ? "has-realistic-model" : ""}`}
            >
              <div className="viewer-tabs">
                <button
                  className={view === "photo" ? "active" : ""}
                  onClick={() => setView("photo")}
                >
                  {t("摄影")}
                </button>
                {selected.shape && (
                  <button
                    className={view === "simple" ? "active" : ""}
                    onClick={() => setView("simple")}
                  >
                    {t("本地示意")}
                  </button>
                )}
                {model && (
                  <button
                    className={view === "online" ? "active" : ""}
                    onClick={() => setView("online")}
                  >
                    {t("在线 3D ↗")}
                  </button>
                )}
              </div>
              {view === "photo" ? (
                <img
                  className="viewer-photo"
                  src={imagePath(selected.id)}
                  alt={selected.name}
                  style={{ objectPosition: selected.imagePosition }}
                />
              ) : (
                <Suspense
                  fallback={<div className="scene-loading">{t("加载中…")}</div>}
                >
                  {view === "online" && model ? (
                    <RealisticViewer
                      key={selected.id}
                      animal={selected}
                      model={model}
                      playing={playing && motionEnabled}
                      onPlayingChange={setPlaying}
                      onFallback={() => setView("photo")}
                    />
                  ) : (
                    <AnimalScene
                      animal={selected}
                      playing={playing && motionEnabled}
                    />
                  )}
                </Suspense>
              )}
              {view !== "online" && (
                <div className="local-viewer-bar">
                  <span>
                    {view === "photo"
                      ? t("摄影 · 本地文件")
                      : t("简化示意 · 拖动环绕")}
                  </span>
                  {view === "simple" && (
                    <button
                      className="round-button"
                      aria-label={
                        playing ? t("暂停动物动画") : t("播放动物动画")
                      }
                      disabled={!motionEnabled}
                      onClick={() => setPlaying((v) => !v)}
                    >
                      {playing ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="detail-panel">
              <div className="detail-identity">
                <div>
                  <h2>{selected.name}</h2>
                  <small>
                    {preferences.language === "zh"
                      ? selected.english
                      : animals.find((a) => a.id === selected.id)!.name}
                  </small>
                </div>
                <button
                  className={`icon-button ${saved.includes(selected.id) ? "active" : ""}`}
                  aria-label={
                    saved.includes(selected.id) ? t("取消收藏") : t("收藏物种")
                  }
                  onClick={save}
                >
                  <Bookmark
                    size={18}
                    fill={saved.includes(selected.id) ? "currentColor" : "none"}
                  />
                </button>
              </div>
              <i className="detail-latin">{selected.latin}</i>
              <div className="detail-tabs" aria-label={t("物种信息")}>
                <button
                  className={detailTab === "info" ? "active" : ""}
                  onClick={() => setDetailTab("info")}
                >
                  {t("资料")}
                </button>
                <button
                  className={detailTab === "download" ? "active" : ""}
                  onClick={() => setDetailTab("download")}
                >
                  {t("下载")}
                </button>
                <button
                  className={detailTab === "source" ? "active" : ""}
                  onClick={() => setDetailTab("source")}
                >
                  {t("来源")}
                </button>
              </div>
              <div className="detail-tab-content panel-scroll">
                {detailTab === "info" && (
                  <>
                    <SpeechButton
                      text={`${selected.name}. ${selected.description} ${t("食性")}: ${selected.diet}. ${t("体型")}: ${selected.size}. ${t("寿命")}: ${selected.lifespan}. ${t("主要分布")}: ${location}. ${t("保护等级")}: ${selected.status}. ${selected.fact}`}
                    />
                    <Status animal={selected} />
                    <dl className="facts-grid">
                      <div>
                        <dt>{t("食性")}</dt>
                        <dd>{selected.diet}</dd>
                      </div>
                      <div>
                        <dt>{t("体型")}</dt>
                        <dd>{selected.size}</dd>
                      </div>
                      <div>
                        <dt>{t("寿命")}</dt>
                        <dd>{selected.lifespan}</dd>
                      </div>
                      <div>
                        <dt>
                          {scope === "china" && selected.china
                            ? t("中国分布")
                            : t("主要分布")}
                        </dt>
                        <dd>{location}</dd>
                      </div>
                    </dl>
                    <p className="animal-description">{selected.description}</p>
                    <div className="animal-fact">{selected.fact}</div>
                  </>
                )}
                {detailTab === "download" && (
                  <ModelDownloads key={selected.id} animal={selected} />
                )}
                {detailTab === "source" && (
                  <div className="source-content">
                    <h3>{t("摄影")}</h3>
                    {credit ? (
                      <>
                        <p>
                          {
                            new DOMParser().parseFromString(
                              credit.artist || t("原作作者"),
                              "text/html",
                            ).body.textContent
                          }
                        </p>
                        <small>{credit.license}</small>
                        <a
                          href={credit.source}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t("原图与许可")}
                          <ArrowUpRight size={13} />
                        </a>
                      </>
                    ) : (
                      <p>
                        {creditError ? t("署名暂时无法加载") : t("加载署名…")}
                      </p>
                    )}
                    {model && (
                      <>
                        <h3>{t("写实模型 · Sketchfab")}</h3>
                        <p>{model.author}</p>
                        <a href={model.url} target="_blank" rel="noreferrer">
                          {t("原作与授权")}
                          <ArrowUpRight size={13} />
                        </a>
                      </>
                    )}
                    <h3>{t("物种资料")}</h3>
                    <a
                      href={`https://en.wikipedia.org/wiki/${selected.wiki}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("百科资料")}
                      <ArrowUpRight size={13} />
                    </a>
                    <p className="source-note">
                      {t(
                        "保护等级为全球 IUCN 类别。体型、寿命为近似范围；坐标为代表性观察位置。",
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}
      {modal === "settings" && (
        <Dialog
          compact
          returnFocus={modalOpener.current}
          onClose={() => setModal(null)}
          label={t("设置与说明")}
        >
          <Settings onClose={() => setModal(null)} />
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
