"use client";
import { useEffect, useSyncExternalStore } from "react";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import pt from "../../messages/pt.json";

const messages: Record<string, typeof en> = { en, es, pt };
type Locale = "en" | "es" | "pt";
const VALID_LOCALES: Locale[] = ["en", "es", "pt"];

function detectLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const cookies = document.cookie || "";
  const directMatch = cookies.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  const directRaw = directMatch?.[1]?.trim().toLowerCase();
  if (directRaw && VALID_LOCALES.includes(directRaw as Locale)) return directRaw as Locale;

  const encodedMatch = cookies.match(/NEXT_LOCALE%3D([^;]+)/i);
  const encodedRaw = encodedMatch?.[1] || "";
  let decoded = "";
  try {
    decoded = decodeURIComponent(encodedRaw).trim().toLowerCase();
  } catch {
    decoded = encodedRaw.trim().toLowerCase();
  }
  if (decoded && VALID_LOCALES.includes(decoded as Locale)) return decoded as Locale;

  const lang = navigator.language?.slice(0, 2);
  if (lang === "es") return "es";
  if (lang === "pt") return "pt";
  return "en";
}

let currentLocale: Locale = "en";
let localeInitialized = false;
const listeners = new Set<() => void>();

function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getClientLocaleSnapshot(): Locale {
  return currentLocale;
}

function getServerLocaleSnapshot(): Locale {
  return "en";
}

function emitLocaleChange() {
  listeners.forEach((listener) => listener());
}

function ensureLocaleInitialized() {
  if (localeInitialized || typeof window === "undefined") return;
  localeInitialized = true;
  const detected = detectLocale();
  if (detected !== currentLocale) {
    currentLocale = detected;
    emitLocaleChange();
  }
}

type Messages = typeof en;
type DeepValue<T, K extends string> = K extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T ? DeepValue<T[Head], Tail> : string
  : K extends keyof T ? T[K] : string;

/** Same locale source as `useT` — use for UI that must match translations (e.g. Settings language radios). */
export function useLocale(): Locale {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getClientLocaleSnapshot,
    getServerLocaleSnapshot
  );
  useEffect(() => {
    ensureLocaleInitialized();
  }, []);
  return locale;
}

export function useT(namespace?: string) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getClientLocaleSnapshot,
    getServerLocaleSnapshot
  );

  useEffect(() => {
    ensureLocaleInitialized();
  }, []);

  const msgs = messages[locale] || messages.en;

  return function t(key: string, params?: Record<string, string | number>): string {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const parts = fullKey.split(".");
    let value: unknown = msgs;
    for (const part of parts) {
      if (value && typeof value === "object" && part in (value as object)) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return fullKey; // fallback to key
      }
    }
    let str = typeof value === "string" ? value : fullKey;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  };
}

export function setLocale(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
  if (VALID_LOCALES.includes(locale as Locale) && currentLocale !== locale) {
    currentLocale = locale as Locale;
    emitLocaleChange();
  }
  window.location.reload();
}
