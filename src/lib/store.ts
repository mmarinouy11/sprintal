import { create } from "zustand";
import { Sprint, Bet, Evidence, SignalCheck, Organization } from "@/types";

interface SprintalStore {
  org: Organization | null;
  sprints: Sprint[];
  bets: Bet[];
  evidence: Evidence[];
  signalChecks: SignalCheck[];
  loading: boolean;
  setOrg: (org: Organization) => void;
  setSprints: (sprints: Sprint[]) => void;
  setBets: (bets: Bet[]) => void;
  setEvidence: (evidence: Evidence[]) => void;
  setSignalChecks: (signalChecks: SignalCheck[]) => void;
  setLoading: (loading: boolean) => void;
  addSprint: (sprint: Sprint) => void;
  updateSprint: (sprint: Sprint) => void;
  addBet: (bet: Bet) => void;
  updateBet: (bet: Bet) => void;
  addEvidence: (ev: Evidence) => void;
  addSignalCheck: (sc: SignalCheck) => void;
  getActiveSprint: () => Sprint | undefined;
  getSprintBets: (sprintId: string) => Bet[];
}

export const useStore = create<SprintalStore>((set, get) => ({
  org: null,
  sprints: [],
  bets: [],
  evidence: [],
  signalChecks: [],
  loading: true,
  setOrg: (org) => set({ org }),
  setSprints: (sprints) => set({ sprints }),
  setBets: (bets) => set({ bets }),
  setEvidence: (evidence) => set({ evidence }),
  setSignalChecks: (signalChecks) => set({ signalChecks }),
  setLoading: (loading) => set({ loading }),
  addSprint: (sprint) => set((s) => ({ sprints: [sprint, ...s.sprints] })),
  updateSprint: (sprint) =>
    set((s) => ({ sprints: s.sprints.map((x) => (x.id === sprint.id ? sprint : x)) })),
  addBet: (bet) => set((s) => ({ bets: [...s.bets, bet] })),
  updateBet: (bet) =>
    set((s) => ({ bets: s.bets.map((x) => (x.id === bet.id ? bet : x)) })),
  addEvidence: (ev) => set((s) => ({ evidence: [ev, ...s.evidence] })),
  addSignalCheck: (sc) => set((s) => ({ signalChecks: [sc, ...s.signalChecks] })),
  getActiveSprint: () => get().sprints.find((s) => s.status === "Active"),
  getSprintBets: (sprintId) => get().bets.filter((b) => b.sprint_id === sprintId),
}));
