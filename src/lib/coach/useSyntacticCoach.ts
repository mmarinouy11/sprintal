"use client";
import { useState, useRef, useCallback } from "react";
import { FIELD_PROMPTS } from "./prompts";
import { supabase } from "@/lib/supabase";

export type CoachField = keyof typeof FIELD_PROMPTS;

interface CoachResult {
  observation: string | null;
  loading: boolean;
}

const DEBOUNCE_MS = 1400;
const MIN_LENGTH = 20;

export function useSyntacticCoach(sprintDays?: number) {
  const [results, setResults] = useState<Record<string, CoachResult>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const check = useCallback(async (field: CoachField, value: string) => {
    if (timers.current[field]) clearTimeout(timers.current[field]);

    if (!value || value.trim().length < MIN_LENGTH) {
      setResults(prev => ({ ...prev, [field]: { observation: null, loading: false } }));
      return;
    }

    timers.current[field] = setTimeout(async () => {
      setResults(prev => ({
        ...prev,
        [field]: { observation: prev[field]?.observation || null, loading: true },
      }));

      try {
        // Get session token for auth
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          setResults(prev => ({ ...prev, [field]: { observation: null, loading: false } }));
          return;
        }

        const res = await fetch("/api/coach", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            field,
            value: value.trim(),
            sprintDays,
            locale: document.cookie.match(/NEXT_LOCALE=([^;]+)/)?.[1] || navigator.language?.slice(0, 2) || "en",
          }),
        });

        const data = await res.json();
        setResults(prev => ({
          ...prev,
          [field]: { observation: data.observation || null, loading: false },
        }));
      } catch {
        setResults(prev => ({ ...prev, [field]: { observation: null, loading: false } }));
      }
    }, DEBOUNCE_MS);
  }, [sprintDays]);

  const clear = useCallback((field: CoachField) => {
    if (timers.current[field]) clearTimeout(timers.current[field]);
    setResults(prev => ({ ...prev, [field]: { observation: null, loading: false } }));
  }, []);

  return { results, check, clear };
}
