import { Capacitor } from "@capacitor/core";
import { useSyncExternalStore } from "react";
import { registerSW } from "virtual:pwa-register";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
const standalone = matchMedia("(display-mode: standalone)");
const isInstalled = () => standalone.matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
let state = {
  installed: isInstalled(),
  canInstall: false,
  installing: false,
  installError: false,
  offline: "preparing" as "preparing" | "ready" | "unavailable",
  updateReady: false,
  updating: false,
  updateError: false,
};
let deferredPrompt: InstallPrompt | null = null;
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;
const listeners = new Set<() => void>();
function change(patch: Partial<typeof state>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}
export function usePwa() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, () => state);
}

// Start before React mounts: the install event can arrive before Settings opens.
export function initPwa() {
  if (Capacitor.isNativePlatform()) return;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPrompt;
    change({ canInstall: true, installError: false });
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    change({ installed: true, canInstall: false, installing: false });
  });
  standalone.addEventListener("change", () => change({ installed: isInstalled() }));
  if (!import.meta.env.PROD || !window.isSecureContext || !("serviceWorker" in navigator)) {
    change({ offline: "unavailable" });
    return;
  }
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => change({ updateReady: true }),
    onOfflineReady: () => change({ offline: "ready" }),
    onRegisterError: () => change({ offline: "unavailable" }),
    onRegisteredSW: (_url, registration) => {
      if (!registration) return;
      if (registration.active) change({ offline: "ready" });
      // Surface failed precaches (for example, a full device) without claiming offline support.
      const watchInstall = () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "redundant" && !registration.active)
            change({ offline: "unavailable" });
        });
      };
      watchInstall();
      registration.addEventListener("updatefound", watchInstall);
      let lastCheck = Date.now();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && navigator.onLine && Date.now() - lastCheck > 3600_000) {
          lastCheck = Date.now();
          void registration.update().catch(() => { /* Keep the installed offline version. */ });
        }
      });
    },
  });
}

export async function installPwa() {
  const prompt = deferredPrompt;
  if (!prompt || state.installing) return;
  deferredPrompt = null; // Browser install events can only be used once.
  change({ installing: true, canInstall: false, installError: false });
  try {
    await prompt.prompt();
    await prompt.userChoice;
    // An accepted prompt is not proof of installation; wait for appinstalled.
  } catch {
    change({ installError: true });
  } finally {
    change({ installing: false });
  }
}

export async function updatePwa() {
  if (!updateSW || state.updating) return;
  change({ updating: true, updateError: false });
  try {
    await updateSW(true);
  } catch {
    change({ updating: false, updateError: true });
  }
}
