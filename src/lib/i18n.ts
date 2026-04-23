"use client";
import { useState, useEffect } from "react";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import pt from "../../messages/pt.json";

const messages: Record<string, typeof en> = { en, es, pt };

function getLocale(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
  if (match && ["en", "es", "pt"].includes(match[1])) return match[1];
  const lang = navigator.language?.slice(0, 2);
  if (lang === "es") return "es";
  if (lang === "pt") return "pt";
  return "en";
}

type Messages = typeof en;
type DeepValue<T, K extends string> = K extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T ? DeepValue<T[Head], Tail> : string
  : K extends keyof T ? T[K] : string;

export function useT(namespace?: string) {
  const [locale, setLocale] = useState<string>("en");

  useEffect(() => {
    setLocale(getLocale());
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
  window.location.reload();
}
