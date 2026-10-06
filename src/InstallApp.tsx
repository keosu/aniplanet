import { Capacitor } from "@capacitor/core";
import { Download, RefreshCw } from "lucide-react";
import { installPwa, updatePwa, usePwa } from "./pwa";
import { usePreferences } from "./preferences";

export function InstallApp() {
  const pwa = usePwa();
  const { t } = usePreferences();
  if (Capacitor.isNativePlatform()) return null;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return (
    <section className="setting-section install-app">
      <h3>{t("安装应用")}</h3>
      {pwa.installed ? <p>{t("应用已安装，可从主屏幕或应用列表打开。")}</p> : (
        <>
          <p>{t("将野境添加到设备，使用独立窗口探索动物。")}</p>
          {pwa.canInstall || pwa.installing ? (
            <button className="speech-button" disabled={pwa.installing} onClick={() => void installPwa()}>
              <Download size={17} />
              {t(pwa.installing ? "正在安装…" : "安装到设备")}
            </button>
          ) : (
            <p>{t(ios
              ? "在 Safari 中打开，轻点分享，选择“添加到主屏幕”，并开启“作为网页 App 打开”（如有）。"
              : "打开浏览器菜单，选择“安装应用”或“将此页面安装为应用”。如果没有此项，请使用 Chrome 或 Edge；手机内置浏览器中请先选择“在浏览器中打开”。")}</p>
          )}
          {pwa.installError && <p role="alert">{t("安装未完成，请从浏览器菜单重试。")}</p>}
        </>
      )}
      <p className="pwa-status" role="status">
        {t(pwa.offline === "ready"
          ? "离线内容已就绪：物种资料、摄影、地球和本地 3D 均可离线使用。"
          : pwa.offline === "preparing"
            ? "正在准备离线内容（约 45 MB），首次请保持联网，完成后会在此提示。"
            : "离线内容尚未就绪。请保持联网，并使用支持离线功能的浏览器重新打开。")}
      </p>
      <p>{t("在线 3D 与部分系统语音仍需要网络。浏览器清理网站数据后，需要重新准备离线内容。")}</p>
      {pwa.updateReady && (
        <div className="pwa-update" role="status">
          <p>{t("新版本已准备好，重新打开即可更新，收藏和设置会保留。")}</p>
          <button className="speech-button" disabled={pwa.updating} onClick={() => void updatePwa()}>
            <RefreshCw size={17} />
            {t(pwa.updating ? "正在更新…" : "更新并重新打开")}
          </button>
          {pwa.updateError && <p role="alert">{t("更新未完成，请稍后重试。")}</p>}
        </div>
      )}
    </section>
  );
}
