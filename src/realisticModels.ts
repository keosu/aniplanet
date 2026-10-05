import catalog from "./realistic-models.json";

export interface RealisticModel {
  uid: string;
  title: string;
  author: string;
  authorUrl: string;
  url: string;
  animationCount: number;
  faceCount: number;
  license: string;
  licenseUrl: string | null;
  delivery: string;
  isDownloadable: boolean;
  downloadCheckedAt: string;
  variant?: string;
}

export const realisticModels: Partial<Record<string, RealisticModel>> = catalog;
export const realisticModelCount = Object.keys(catalog).length;
