import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInDays, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sprintProgress(start: string, end: string): number {
  const now = new Date();
  const s = parseISO(start);
  const e = parseISO(end);
  const total = differenceInDays(e, s);
  const elapsed = differenceInDays(now, s);
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
}

export function daysRemaining(end: string): number {
  return Math.max(0, differenceInDays(parseISO(end), new Date()));
}

export function isTrialExpiring(trialEndsAt: string): boolean {
  return differenceInDays(parseISO(trialEndsAt), new Date()) <= 30;
}

export function isTrialExpired(trialEndsAt: string): boolean {
  return differenceInDays(parseISO(trialEndsAt), new Date()) <= 0;
}

export const STATUS_COLORS: Record<string, string> = {
  Active: "#38BDF8",
  Scaled: "#00C864",
  Pivoted: "#A090FF",
  Done: "#34D399",
  Killed: "#E63232",
};

export const SIGNAL_COLORS: Record<string, string> = {
  Strong: "#00C864",
  Unclear: "#EAA012",
  Weak: "#E63232",
};

export const AREAS = [
  "MU-1","MU-2","MU-3","MU-4",
  "HR","TAG","L&D","Marketing","Delivery"
];
