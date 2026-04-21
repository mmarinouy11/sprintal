import { create } from "zustand";
import {
  Organization, Sprint, Bet, Evidence,
  SignalCheck, OrgRole, OrgTreeNode, BetAlignment
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

  // ── Setters ──────────────────────────────────────────
  setOrg:          (org: Organization) => void;
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
};

export const useStore = create<Store>((set) => ({
  ...initialState,

  // Setters
  setOrg:          (org)          => set({ org }),
  setSprints:      (sprints)      => set({ sprints }),
  setBets:         (bets)         => set({ bets }),
  setEvidence:     (evidence)     => set({ evidence }),
  setSignalChecks: (signalChecks) => set({ signalChecks }),
  setLoading:      (loading)      => set({ loading }),
  setOrgTree:      (orgTree)      => set({ orgTree }),
  setRootPlan:     (rootPlan)     => set({ rootPlan }),
  setCurrentRole:  (currentRole)  => set({ currentRole }),
  setChildOrgs:      (childOrgs)    => set({ childOrgs }),
  setBetAlignments:  (betAlignments) => set({ betAlignments }),
  addBetAlignment:   (a)  => set(s => ({ betAlignments: [...s.betAlignments, a] })),
  removeBetAlignment:(id) => set(s => ({ betAlignments: s.betAlignments.filter(a => a.id !== id) })),

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
