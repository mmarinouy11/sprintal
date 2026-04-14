export type Plan = "trial" | "starter" | "growth" | "scale" | "enterprise";
export type OrgRole = "owner" | "admin" | "member";
export type BetStatus = "Active" | "Scaled" | "Pivoted" | "Done" | "Killed";
export type SignalStrength = "Strong" | "Unclear" | "Weak";
export type SprintStatus = "Planned" | "Active" | "Closed";
export type ImpactLevel = "High" | "Medium" | "Low";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  plan: Plan;
  trial_ends_at: string;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  email: string;
  full_name?: string;
}

export interface Sprint {
  id: string;
  org_id: string;
  name: string;
  start_date: string;
  end_date: string;
  focus: string;
  signals?: string;
  status: SprintStatus;
  closure?: SprintClosure;
  created_at: string;
}

export interface SprintClosure {
  worked: string;
  didnt: string;
  surprised: string;
  hr: string;
  tag: string;
  ld: string;
  mkt: string;
  date: string;
}

export interface Bet {
  id: string;
  org_id: string;
  sprint_id: string;
  name: string;
  owner_area: string;
  owner_contact: string;
  status: BetStatus;
  signal: SignalStrength;
  outcome: string;
  hypothesis: string;
  why_now?: string;
  indicators: string[];
  kill_criteria: string;
  scale_trigger: string;
  alignment: string[];
  revenue: ImpactLevel;
  margin: ImpactLevel;
  importance: ImpactLevel;
  last_reviewed?: string;
  last_note?: string;
  is_draft: boolean;
  source_bet_id?: string;
  closure_learning?: string;
  created_at: string;
}

export interface Evidence {
  id: string;
  org_id: string;
  bet_id: string;
  date: string;
  actual: string;
  insight: string;
  new_status: BetStatus;
  action?: string;
  created_at: string;
}

export interface SignalCheck {
  id: string;
  org_id: string;
  bet_id: string;
  date: string;
  prev_signal: SignalStrength;
  signal: SignalStrength;
  note?: string;
  created_at: string;
}
