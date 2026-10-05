import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as NativeApp } from "@capacitor/app";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { Square, Volume2 } from "lucide-react";
import { usePreferences } from "./preferences";

export function SpeechButton({ text }: { text: string }) {
  const {
    preferences: { language, speechRate },
    t,
  } = usePreferences();
  const [state, setState] = useState<"idle" | "loading" | "speaking">("idle");
  const [error, setError] = useState("");
  const request = useRef(0);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const native = Capacitor.isNativePlatform();
  const supported =
    native ||
    ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
  const stopEngine = useCallback(() => {
    request.current++;
    utterance.current = null;
    if (native) void TextToSpeech.stop().catch(() => {});
    else if ("speechSynthesis" in window) speechSynthesis.cancel();
  }, [native]);
  useEffect(() => {
    setState("idle");
    setError("");
    return stopEngine;
  }, [text, language, speechRate, stopEngine]);
  useEffect(() => {
    const stop = () => {
      stopEngine();
      setState("idle");
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", visibility);
    const listener = native ? NativeApp.addListener("pause", stop) : null;
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      void listener?.then((handle) => handle.remove());
    };
  }, [native, stopEngine]);
  function speak() {
    if (state !== "idle") {
      stopEngine();
      setState("idle");
      return;
    }
    const id = ++request.current;
    const lang = language === "zh" ? "zh-CN" : "en-US";
    setError("");
    setState("loading");
    const fail = (message = "语音播放失败，请检查设备的语音服务后重试。") => {
      if (request.current !== id) return;
      setError(message);
      setState("idle");
    };
    if (native) {
      void (async () => {
        await TextToSpeech.stop();
        if (request.current !== id) return;
        const available = await TextToSpeech.isLanguageSupported({ lang });
        if (request.current !== id) return;
        if (!available.supported) {
          fail("请在设备的文字转语音设置中安装当前语言的语音包。");
          return;
        }
        setState("speaking");
        await TextToSpeech.speak({
          text,
          lang,
          rate: speechRate,
          category: "ambient",
        });
        if (request.current === id) setState("idle");
      })().catch(() => fail());
      return;
    }
    if (!supported) {
      fail("此浏览器不支持语音介绍，请使用系统浏览器或 Android 应用。");
      return;
    }
    speechSynthesis.cancel();
    const voices = speechSynthesis.getVoices();
    const matches = voices.filter((voice) =>
      voice.lang
        .toLowerCase()
        .replace("_", "-")
        .startsWith(language === "zh" ? "zh" : "en"),
    );
    if (voices.length && !matches.length) {
      fail("请在设备的文字转语音设置中安装当前语言的语音包。");
      return;
    }
    const voice =
      matches.find((voice) => voice.localService && voice.lang === lang) ||
      matches.find((voice) => voice.localService) ||
      matches[0];
    // Short utterances also work on browsers that time out on long passages.
    const sentences = [
      ...new Intl.Segmenter(lang, { granularity: "sentence" }).segment(text),
    ].map((part) => part.segment);
    function next() {
      if (request.current !== id) return;
      const sentence = sentences.shift();
      if (!sentence) {
        utterance.current = null;
        setState("idle");
        return;
      }
      const speech = new SpeechSynthesisUtterance(sentence);
      utterance.current = speech;
      speech.lang = lang;
      speech.rate = speechRate;
      if (voice) speech.voice = voice;
      speech.onstart = () => {
        if (request.current === id) setState("speaking");
      };
      speech.onend = next;
      speech.onerror = () => fail();
      speechSynthesis.speak(speech);
    }
    next();
  }
  return (
    <div className="speech-control">
      <button
        className={`speech-button ${state !== "idle" ? "active" : ""}`}
        onClick={speak}
        aria-pressed={state !== "idle"}
        disabled={!supported}
      >
        {state === "idle" ? <Volume2 size={17} /> : <Square size={15} />}
        {t(state === "idle" ? "语音介绍" : "停止朗读")}
        <small>{language === "zh" ? "中文" : "EN"}</small>
      </button>
      <span className="sr-only" role="status">
        {state === "speaking"
          ? t("正在朗读")
          : state === "loading"
            ? t("准备语音…")
            : ""}
      </span>
      {(error || !supported) && (
        <p className="speech-error" role="status">
          {t(
            error ||
              "此浏览器不支持语音介绍，请使用系统浏览器或 Android 应用。",
          )}
        </p>
      )}
    </div>
  );
}
