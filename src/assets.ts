// Public assets must follow Vite's base for both Pages subpaths and Capacitor.
export const assetPath = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
