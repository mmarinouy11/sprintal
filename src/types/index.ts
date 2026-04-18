export type Plan         = "trial" | "starter" | "growth" | "scale" | "enterprise";
export type OrgRole      = "owner" | "admin" | "editor" | "viewer";
export type BetStatus    = "Active" | "Scaled" | "Pivoted" | "Done" | "Killed";
export type SignalStrength = "Strong" | "Unclear" | "Weak";
export type SprintStatus = "Planned" | "Active" | "Closed";
export type ImpactLevel  = "High" | "Medium" | "Low";
export type BetType      = "strategic" | "enabler";
export type CascadeLevel = 1 | 2 | 3 | 4;

export interface Organization {
  id:                   string;
  name:                 string;
  slug:                 string;
  logo_url?:            string;
  primary_color?:       string;
  plan:                 Plan;
  trial_ends_at:        string;
  onboarding_complete:  boolean;
  // Multinivel
  parent_org_id?:       string | null;
  cascade_level:        CascadeLevel;
  org_path?:            string;
  level_name?:          string;
  parent_area?:         string | null; // e.g. "Holding", "Business Unit", "Region", "Squad"
  created_at:           string;
}

export interface OrgMember {
  id:         string;
  org_id:     string;
  user_id:    string;
  role:       OrgRole;
  email?:     string;
  full_name?: string;
}

export interface OrgRole_ {
  id:         string;
  org_id:     string;
  user_id:    string;
  role:       OrgRole;
  created_at: string;
}

export interface Sprint {
  id:         string;
  org_id:     string;
  name:       string;
  start_date: string;
  end_date:   string;
  focus:      string;
  signals?:   string;
  status:     SprintStatus;
  closure?:   SprintClosure;
  created_at: string;
}

export interface SprintClosure {
  worked:    string;
  didnt:     string;
  surprised: string;
  hr:        string;
  tag:       string;
  ld:        string;
  mkt:       string;
  date:      string;
}

export interface Bet {
  id:               string;
  org_id:           string;
  sprint_id:        string;
  name:             string;
  owner_area:       string;
  owner_contact:    string;
  status:           BetStatus;
  signal:           SignalStrength;
  outcome:          string;
  hypothesis:       string;
  why_now?:         string;
  indicators:       string[];
  kill_criteria:    string;
  scale_trigger:    string;
  alignment:        string[];
  revenue:          ImpactLevel;
  margin:           ImpactLevel;
  importance:       ImpactLevel;
  last_reviewed?:   string;
  last_note?:       string;
  is_draft:         boolean;
  source_bet_id?:   string;
  closure_learning?: string;
  bet_type:          BetType;
  parent_alert:      boolean;
  parent_alert_status?: BetStatus;
  created_at:       string;
}

export interface Evidence {
  id:          string;
  org_id:      string;
  bet_id:      string;
  date:        string;
  actual:      string;
  insight:     string;
  new_status:  BetStatus;
  action?:     string;
  created_at:  string;
}

export interface SignalCheck {
  id:          string;
  org_id:      string;
  bet_id:      string;
  date:        string;
  prev_signal: SignalStrength;
  signal:      SignalStrength;
  note?:       string;
  created_at:  string;
}

// ── Multinivel ────────────────────────────────────────
// Árbol de orgs para el org switcher
export interface OrgTreeNode {
  org:      Organization;
  children: OrgTreeNode[];
  depth:    number;
}

export interface BetAlignment {
  id:            string;
  child_bet_id:  string;
  parent_bet_id: string;
  created_at:    string;
}

