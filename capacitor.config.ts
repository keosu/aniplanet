import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.wildatlas.app",
  appName: "Wild Atlas 野境",
  webDir: "dist",
  backgroundColor: "#081827",
  android: { backgroundColor: "#081827" },
  plugins: {
    SystemBars: {
      style: "DARK",
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
    },
  },
};

export default config;
