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

/**
 * Cadence config based on sprint duration.
 * Review = 3 times per sprint cycle
 * Signal Check = 2x per review interval (midpoint between reviews)
 */
export function getCadenceConfig(sprintDurationDays: number) {
  const reviewInterval = Math.round(sprintDurationDays / 3);   // e.g. 30 for 90-day sprint
  const signalInterval = Math.round(reviewInterval / 2);        // e.g. 15 for 90-day sprint
  return {
    reviewInterval,           // days between Strategic Reviews
    signalInterval,           // days between Signal Checks
    reviewOverdueAt: Math.round(reviewInterval * 1.2),  // 20% grace
    signalOverdueAt: Math.round(signalInterval * 1.3),  // 30% grace
  };
}

export function getSprintDuration(start: string, end: string): number {
  return Math.max(1, differenceInDays(parseISO(end), parseISO(start)));
}

export const STATUS_COLORS: Record<string, string> = {
  Active:  "#2563EB",
  Scaled:  "#059669",
  Pivoted: "#7C3AED",
  Done:    "#0891B2",
  Killed:  "#DC2626",
};

export const SIGNAL_COLORS: Record<string, string> = {
  Strong:  "#059669",
  Unclear: "#D97706",
  Weak:    "#DC2626",
};

// Default areas — used as fallback only; real areas come from org config
export const AREAS = [
  "MU-1","MU-2","MU-3","MU-4",
  "HR","TAG","L&D","Marketing","Delivery"
];


// ── Multinivel helpers ────────────────────────────────

/**
 * Construye un árbol de OrgTreeNode a partir de una lista plana de orgs.
 * Las orgs deben venir ordenadas por cascade_level ASC.
 */
export function buildOrgTree(
  orgs: import("@/types").Organization[],
  rootId: string
): import("@/types").OrgTreeNode | null {
  const map = new Map<string, import("@/types").OrgTreeNode>();

  // Crear nodos
  for (const org of orgs) {
    map.set(org.id, { org, children: [], depth: org.cascade_level - 1 });
  }

  let root: import("@/types").OrgTreeNode | null = null;

  // Conectar hijos a padres
  for (const org of orgs) {
    const node = map.get(org.id)!;
    if (org.id === rootId) {
      root = node;
    } else if (org.parent_org_id) {
      const parent = map.get(org.parent_org_id);
      if (parent) parent.children.push(node);
    }
  }

  return root;
}

/**
 * Aplanar el árbol para renderizar listas indentadas.
 */
export function flattenOrgTree(
  node: import("@/types").OrgTreeNode
): import("@/types").OrgTreeNode[] {
  const result: import("@/types").OrgTreeNode[] = [node];
  for (const child of node.children) {
    result.push(...flattenOrgTree(child));
  }
  return result;
}

/**
 * Nombres de nivel por defecto según cascade_level.
 */
