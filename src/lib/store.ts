import { create } from "zustand";
import {
  Organization, Sprint, Bet, Evidence,
  SignalCheck, OrgRole, OrgTreeNode, BetAlignment, NotificationItem
} from "@/types";

interface Store {
  // ── Core state ───────────────────────────────────────
  org:          Organization | null;
  sprints:      Sprint[];
  bets:         Bet[];
  evidence:     Evidence[];
  signalChecks: SignalCheck[];
  loading:      boolean;

  // ── Multinivel ───────────────────────────────────────
  rootPlan:     string;               // plan de la org raíz (L1)
  orgTree:      OrgTreeNode | null;   // árbol completo del L1 hacia abajo
  currentRole:  OrgRole | null;       // rol del usuario en la org actual
  childOrgs:    Organization[];       // sub-orgs directas del nivel actual
  betAlignments: BetAlignment[];       // cascade alignment links
  notifications: NotificationItem[];
  unreadCount: number;

  /** Parent org row (from /api/org/data) for hierarchy navigation */
  parentOrg: Organization | null;
  /** True when viewing an ancestor org without membership (read-only, ?from=childSlug) */
  ancestorReadOnly: boolean;
  /** Slug of the org where the user has membership (context for read-only ancestor view) */
  memberContextSlug: string | null;
  memberContextName: string | null;

  // ── Setters ──────────────────────────────────────────
  setOrg:          (org: Organization) => void;
  updateOrg:       (updates: Partial<Organization>) => void;
  role:            OrgRole | null;
  setSprints:      (sprints: Sprint[]) => void;
  setBets:         (bets: Bet[]) => void;
  setEvidence:     (evidence: Evidence[]) => void;
  setSignalChecks: (signalChecks: SignalCheck[]) => void;
  setLoading:      (loading: boolean) => void;
  setOrgTree:      (tree: OrgTreeNode | null) => void;
  setRootPlan:     (plan: string) => void;
  setCurrentRole:  (role: OrgRole | null) => void;
  setChildOrgs:      (orgs: Organization[]) => void;
  setBetAlignments:  (alignments: BetAlignment[]) => void;
  addBetAlignment:   (alignment: BetAlignment) => void;
  removeBetAlignment:(id: string) => void;
  setNotifications: (items: NotificationItem[]) => void;
  markRead: (ids: string[]) => void;
  markAllRead: () => void;
  setParentOrg: (org: Organization | null) => void;
  setAncestorReadOnly: (v: boolean) => void;
  setMemberContextSlug: (slug: string | null) => void;
  setMemberContextName: (name: string | null) => void;

  // ── Mutations ────────────────────────────────────────
  addSprint:      (sprint: Sprint) => void;
  updateSprint:   (sprint: Sprint) => void;
  addBet:         (bet: Bet) => void;
  updateBet:      (bet: Bet) => void;
  addEvidence:    (evidence: Evidence) => void;
  addSignalCheck: (sc: SignalCheck) => void;

  // ── Reset ────────────────────────────────────────────
  reset: () => void;
}

const initialState = {
  org:          null,
  sprints:      [],
  bets:         [],
  evidence:     [],
  signalChecks: [],
  loading:      false,
  rootPlan:     'trial',
  orgTree:      null,
  currentRole:  null,
  childOrgs:     [],
  betAlignments: [],
  notifications: [],
  unreadCount: 0,
  parentOrg: null,
  ancestorReadOnly: false,
  memberContextSlug: null,
  memberContextName: null,
};

export const useStore = create<Store>((set) => ({
  ...initialState,

  // Setters
  setOrg:          (org)          => set({ org }),
  updateOrg:       (updates)      => set(s => ({ org: s.org ? { ...s.org, ...updates } : null })),
  role:            null,
  setSprints:      (sprints)      => set({ sprints }),
  setBets:         (bets)         => set({ bets }),
  setEvidence:     (evidence)     => set({ evidence }),
  setSignalChecks: (signalChecks) => set({ signalChecks }),
  setLoading:      (loading)      => set({ loading }),
  setOrgTree:      (orgTree)      => set({ orgTree }),
  setRootPlan:     (rootPlan)     => set({ rootPlan }),
  setCurrentRole:  (currentRole)  => set({ currentRole, role: currentRole }),
  setChildOrgs:      (childOrgs)    => set({ childOrgs }),
  setBetAlignments:  (betAlignments) => set({ betAlignments }),
  addBetAlignment:   (a)  => set(s => ({ betAlignments: [...s.betAlignments, a] })),
  removeBetAlignment:(id) => set(s => ({ betAlignments: s.betAlignments.filter(a => a.id !== id) })),
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),
  markRead: (ids) =>
    set((s) => {
      const setIds = new Set(ids);
      const notifications = s.notifications.map((n) =>
        setIds.has(n.id) ? { ...n, read: true } : n
      );
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    }),
  markAllRead: () =>
    set((s) => {
      const notifications = s.notifications.map((n) => ({ ...n, read: true }));
      return { notifications, unreadCount: 0 };
    }),
  setParentOrg: (parentOrg) => set({ parentOrg }),
  setAncestorReadOnly: (ancestorReadOnly) => set({ ancestorReadOnly }),
  setMemberContextSlug: (memberContextSlug) => set({ memberContextSlug }),
  setMemberContextName: (memberContextName) => set({ memberContextName }),

  // Mutations
  addSprint:      (sprint) => set(s => ({ sprints: [...s.sprints, sprint] })),
  updateSprint:   (sprint) => set(s => ({ sprints: s.sprints.map(x => x.id === sprint.id ? sprint : x) })),
  addBet:         (bet)    => set(s => ({ bets: [...s.bets, bet] })),
  updateBet:      (bet)    => set(s => ({ bets: s.bets.map(x => x.id === bet.id ? bet : x) })),
  addEvidence:    (ev)     => set(s => ({ evidence: [ev, ...s.evidence] })),
  addSignalCheck: (sc)     => set(s => ({ signalChecks: [sc, ...s.signalChecks] })),

  // Reset — usado al hacer logout o cambiar de org
  reset: () => set(initialState),
}));
