import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import messages from "./messages.en.json";

export type Language = "zh" | "en";
export type Theme = "ocean" | "forest" | "sand" | "ice";
export type Preferences = {
  language: Language;
  theme: Theme;
  fontSize: "comfortable" | "large";
  motion: boolean;
  speechRate: number;
};
export const themes: {
  id: Theme;
  name: string;
  color: string;
  background: string;
}[] = [
  { id: "ocean", name: "蔚蓝海洋", color: "#80ceff", background: "#081827" },
  { id: "forest", name: "墨绿森林", color: "#c6eaa0", background: "#0b1715" },
  { id: "sand", name: "大地沙丘", color: "#edc38e", background: "#211a14" },
  { id: "ice", name: "冰川极光", color: "#a9b9ff", background: "#14182a" },
];
function readPreferences(): Preferences {
  const defaults: Preferences = {
    language: "zh",
    theme: "ocean",
    fontSize: "comfortable",
    motion: true,
    speechRate: 1,
  };
  try {
    const value = JSON.parse(
      localStorage.getItem("wild-atlas-preferences") || "null",
    );
    if (!value || typeof value !== "object") return defaults;
    return {
      language: value.language === "en" ? "en" : "zh",
      theme: themes.some((theme) => theme.id === value.theme)
        ? value.theme
        : defaults.theme,
      fontSize: value.fontSize === "large" ? "large" : "comfortable",
      motion:
        typeof value.motion === "boolean" ? value.motion : defaults.motion,
      speechRate: [0.8, 1, 1.2].includes(value.speechRate)
        ? value.speechRate
        : 1,
    };
  } catch {
    return defaults;
  }
}
const PreferencesContext = createContext<{
  preferences: Preferences;
  update: (patch: Partial<Preferences>) => void;
  reducedMotion: boolean;
  motionEnabled: boolean;
  t: (text: string) => string;
} | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readPreferences);
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        "wild-atlas-preferences",
        JSON.stringify(preferences),
      );
    } catch {
      /* Storage is optional. */
    }
    const root = document.documentElement;
    root.lang = preferences.language === "zh" ? "zh-CN" : "en";
    root.dataset.theme = preferences.theme;
    root.dataset.fontSize = preferences.fontSize;
    root.dataset.motion = preferences.motion && !reducedMotion ? "on" : "off";
    document.title =
      preferences.language === "zh"
        ? "野境 WILD ATLAS · 探索生命"
        : "Wild Atlas · Explore life on Earth";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        themes.find((theme) => theme.id === preferences.theme)!.background,
      );
  }, [preferences, reducedMotion]);
  const update = useCallback(
    (patch: Partial<Preferences>) =>
      setPreferences((current) => ({ ...current, ...patch })),
    [],
  );
  const t = useCallback(
    (text: string) =>
      preferences.language === "zh"
        ? text
        : (messages as Record<string, string>)[text] || text,
    [preferences.language],
  );
  const value = useMemo(
    () => ({
      preferences,
      update,
      reducedMotion,
      motionEnabled: preferences.motion && !reducedMotion,
      t,
    }),
    [preferences, update, reducedMotion, t],
  );
  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("PreferencesProvider is required");
  return context;
}
