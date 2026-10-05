import { useState } from "react";
import { ArrowUpRight, Download, Wifi } from "lucide-react";
import type { Animal } from "./data";
import { realisticModels } from "./realisticModels";
import { usePreferences } from "./preferences";
export function ModelDownloads({ animal }: { animal: Animal }) {
  const { t } = usePreferences();
  const model = realisticModels[animal.id];
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  async function downloadLocal() {
    setExporting(true);
    setError("");
    try {
      const { exportSchematic } = await import("./exportSchematic");
      await exportSchematic(animal);
    } catch {
      setError(t("导出未完成，请重试。"));
    } finally {
      setExporting(false);
    }
  }
  return (
    <section className="model-downloads" aria-label={t("模型来源与下载")}>
      <div className="model-download-heading">
        <Download size={14} />
        <span>{t("模型与下载")}</span>
      </div>
      {model ? (
        <>
          <p>
            <Wifi size={12} />
            {t("写实 3D 由 Sketchfab 在线加载")}
          </p>
          <small>{t("模型文件未保存在本站，查看需要联网。")}</small>
          <a
            className="model-download-link"
            href={model.url}
            target="_blank"
            rel="noreferrer"
          >
            {model.isDownloadable ? (
              <Download size={14} />
            ) : (
              <ArrowUpRight size={14} />
            )}
            {model.isDownloadable
              ? t("前往原站下载写实模型")
              : t("查看写实模型原作")}
            <ArrowUpRight size={12} />
          </a>
          <small>
            {model.isDownloadable
              ? t("在原作页选择 Download 3D Model，可能需要登录。")
              : t("作者未开放直接下载；可在原作页查看授权信息。")}
            {model.licenseUrl && (
              <>
                {t("许可：")}
                <a href={model.licenseUrl} target="_blank" rel="noreferrer">
                  {model.license}
                </a>
                。
              </>
            )}
          </small>
        </>
      ) : (
        <p>{t("已收录本地摄影与科普资料，写实模型待补充。")}</p>
      )}
      {animal.shape && (
        <>
          <button
            className="model-download-link local-download"
            onClick={downloadLocal}
            disabled={exporting}
          >
            <Download size={14} />
            {exporting ? t("正在导出…") : t("下载本地示意模型 · GLB")}
          </button>
          <small>
            {t("本站生成的简化静态几何模型，含材质；不含写实模型及骨骼动画。")}
          </small>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
