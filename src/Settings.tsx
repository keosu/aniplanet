import { BookOpen, Download, Settings2, X } from "lucide-react";
import { useState } from "react";
import { animals } from "./data";
import { realisticModelCount } from "./realisticModels";
import { themes, usePreferences } from "./preferences";
import { SpeechButton } from "./SpeechButton";
import { assetPath } from "./assets";

export const guide = [
  [
    "从地球开始",
    "拖动地球旋转，滚轮或双指缩放，也可以使用方向键。点击动物图标选择物种，聚集的图标会展开区域列表。",
  ],
  [
    "找到感兴趣的动物",
    "切换全球或中国，按生境筛选，输入中文名、英文名、学名或地区搜索。点击书签收藏，收藏与设置保存在当前设备。",
  ],
  [
    "走近动物",
    "点击查看详情，阅读物种资料，或收听当前语言的语音介绍。摄影和本地 3D 示意可离线使用；在线 3D 需要网络，加载失败时可切回摄影。",
  ],
  [
    "轻轻动起来",
    "本地 3D 带有轻微呼吸、摆尾或游动效果；在线模型可选择作者提供的动作。使用暂停按钮或在设置中关闭动物动画。系统的减少动态效果设置优先。",
  ],
  [
    "收听介绍",
    "语音使用设备的文字转语音服务，跟随界面语言，可调节语速。请先安装中文或英文语音包；部分声音需要网络。关闭介绍页或切到后台会停止朗读。",
  ],
  [
    "理解分布与资料",
    "地图坐标是代表性观察位置，不是完整分布范围。中国分布包含部分重引入种群。保护等级为全球 IUCN 类别；体型和寿命为近似范围。",
  ],
];

export function Settings({ onClose }: { onClose: () => void }) {
  const { preferences, update, reducedMotion, t } = usePreferences();
  const [tab, setTab] = useState<"settings" | "guide">("settings");
  return (
    <>
      <div className="dialog-heading">
        <strong>{t("设置与说明")}</strong>
        <button
          className="icon-button"
          aria-label={t("关闭设置与说明")}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div
        className="settings-tabs"
        role="tablist"
        aria-label={t("设置与说明")}
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const next =
            event.key === "Home"
              ? "settings"
              : event.key === "End"
                ? "guide"
                : tab === "settings"
                  ? "guide"
                  : "settings";
          setTab(next);
          document.getElementById(`${next}-tab`)?.focus();
        }}
      >
        <button
          id="settings-tab"
          role="tab"
          tabIndex={tab === "settings" ? 0 : -1}
          aria-selected={tab === "settings"}
          aria-controls="settings-panel"
          onClick={() => setTab("settings")}
        >
          <Settings2 size={17} />
          {t("设置")}
        </button>
        <button
          id="guide-tab"
          role="tab"
          tabIndex={tab === "guide" ? 0 : -1}
          aria-selected={tab === "guide"}
          aria-controls="guide-panel"
          onClick={() => setTab("guide")}
        >
          <BookOpen size={17} />
          {t("使用说明")}
        </button>
      </div>
      {tab === "settings" ? (
        <div
          className="settings-content panel-scroll"
          id="settings-panel"
          role="tabpanel"
          aria-labelledby="settings-tab"
        >
          <section className="setting-section">
            <h3>{t("界面语言")}</h3>
            <div className="segmented-control">
              <button
                lang="zh-CN"
                aria-pressed={preferences.language === "zh"}
                onClick={() => update({ language: "zh" })}
              >
                简体中文
              </button>
              <button
                lang="en"
                aria-pressed={preferences.language === "en"}
                onClick={() => update({ language: "en" })}
              >
                English
              </button>
            </div>
            <p>{t("界面、物种资料与语音一起切换。")}</p>
          </section>
          <section className="setting-section">
            <h3>{t("地球色彩")}</h3>
            <div className="theme-options">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  aria-pressed={preferences.theme === theme.id}
                  onClick={() => update({ theme: theme.id })}
                >
                  <span
                    className="theme-swatch"
                    style={{
                      background: `radial-gradient(circle at 30% 25%, ${theme.color}, ${theme.background} 80%)`,
                    }}
                  />
                  <span>{t(theme.name)}</span>
                  {preferences.theme === theme.id && (
                    <span className="theme-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
          <section className="setting-section">
            <h3>{t("阅读字号")}</h3>
            <div className="segmented-control">
              <button
                aria-pressed={preferences.fontSize === "comfortable"}
                onClick={() => update({ fontSize: "comfortable" })}
              >
                {t("舒适")}
              </button>
              <button
                aria-pressed={preferences.fontSize === "large"}
                onClick={() => update({ fontSize: "large" })}
              >
                {t("大字")}
              </button>
            </div>
            <p>{t("正文默认放大，让探索更轻松。")}</p>
          </section>
          <section className="setting-section setting-motion">
            <div>
              <h3>{t("动物轻量动画")}</h3>
              <p>
                {t(
                  reducedMotion
                    ? "系统已开启减少动态效果，动画保持静止。"
                    : "轻微呼吸、摆尾与游动，可随时暂停。",
                )}
              </p>
            </div>
            <button
              className="toggle"
              role="switch"
              aria-label={t("动物轻量动画")}
              aria-checked={preferences.motion}
              onClick={() => update({ motion: !preferences.motion })}
            >
              <span />
            </button>
          </section>
          <section className="setting-section">
            <label htmlFor="speech-rate">{t("介绍语速")}</label>
            <select
              id="speech-rate"
              value={preferences.speechRate}
              onChange={(event) =>
                update({ speechRate: Number(event.target.value) })
              }
            >
              <option value={0.8}>{t("舒缓 · 0.8×")}</option>
              <option value={1}>{t("自然 · 1×")}</option>
              <option value={1.2}>{t("轻快 · 1.2×")}</option>
            </select>
            <p>{t("语音跟随界面语言，使用设备上可用的声音。")}</p>
            <SpeechButton
              text={t(
                "欢迎来到野境。从一颗地球出发，认识森林、草原、海洋与高山中的动物。选择一个物种，开始探索吧。",
              )}
            />
          </section>
          <p className="settings-saved">{t("设置自动保存在当前设备。")}</p>
        </div>
      ) : (
        <div
          className="settings-content guide-content panel-scroll"
          id="guide-panel"
          role="tabpanel"
          aria-labelledby="guide-tab"
        >
          <div className="about-counts">
            <span>
              <b>{animals.length}</b>
              {t("物种")}
            </span>
            <span>
              <b>{animals.filter((a) => a.china).length}</b>
              {t("中国境内")}
            </span>
            <span>
              <b>{realisticModelCount}</b>
              {t("在线 3D")}
            </span>
          </div>
          <SpeechButton
            text={guide
              .map(
                ([title, body]) =>
                  `${t(title)}${preferences.language === "zh" ? "。" : ". "}${t(body)}`,
              )
              .join("\n")}
          />
          {guide.map(([title, body], index) => (
            <section className="guide-section" key={title}>
              <span aria-hidden="true">0{index + 1}</span>
              <div>
                <h3>{t(title)}</h3>
                <p>{t(body)}</p>
              </div>
            </section>
          ))}
          <div className="guide-sources">
            <h3>{t("影像与模型来源")}</h3>
            <p>
              {t(
                "摄影、地球纹理和在线模型的作者与许可可在物种详情的来源页查阅。模型下载与再利用须遵循原作者许可。",
              )}
            </p>
            <a href={assetPath("image-credits.json")} target="_blank" rel="noreferrer">
              <Download size={15} />
              {t("影像来源清单")}
            </a>
            <a href={assetPath("model-credits.json")} target="_blank" rel="noreferrer">
              <Download size={15} />
              {t("模型来源清单")}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
