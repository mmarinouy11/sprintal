export type Plan         = "trial" | "solo" | "starter" | "growth" | "scale";
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
  coach_syntactic_enabled: boolean;
  coach_semantic_enabled:  boolean;
  paddle_customer_id?: string | null;
  paddle_subscription_id?: string | null;
  paddle_subscription_status?: string | null;
  plan_period?: "monthly" | "annual" | null;
  plan_expires_at?: string | null;
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

export interface CoachUsage {
  id:               string;
  org_id:           string;
  month:            string; // 'YYYY-MM'
  /** Unified monthly credits consumed (1 per formulation check; +SEMANTIC_CREDIT_WEIGHT per strategic analysis). */
  syntactic_calls:  number;
  /** Count of strategic analyses this month (plan cap); field-level coach calls may also increment this. */
  semantic_calls:   number;
}

export type CoachType = "syntactic" | "semantic";
export type NotificationPriority = "urgent" | "important" | "info";
export type NotificationType =
  | "draft_incomplete"
  | "signal_check_due"
  | "review_due"
  | "sprint_expiring"
  | "weak_bet_no_decision"
  | "parent_alert"
  | "invite_accepted"
  | "billing_past_due";

export interface NotificationItem {
  id: string;
  org_id: string;
  user_id: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  emailed: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// Coach credit configuration
// 1 formulation check = 1 credit (increment syntactic_calls by 1)
// 1 strategic analysis = SEMANTIC_CREDIT_WEIGHT credits (increment syntactic_calls)
// All limits are in unified credits (formulation-equivalent)
// ─────────────────────────────────────────────────────────────

export const SEMANTIC_CREDIT_WEIGHT = 10; // 1 semantic = 10 formulation credits

export const COACH_LIMITS: Record<
  Plan,
  {
    totalCredits: number; // unified monthly budget (-1 = unlimited)
    semantic: number; // max strategic analyses (-1 = unlimited)
  }
> = {
  trial: { totalCredits: 50, semantic: 0 },
  solo: { totalCredits: 300, semantic: 30 },
  starter: { totalCredits: 600, semantic: 60 },
  growth: { totalCredits: 1200, semantic: 120 },
  scale: { totalCredits: 3000, semantic: 300 },
};

/** Total unified credits consumed this month (authoritative: syntactic_calls column). */
export function coachUnifiedCreditsUsed(
  u: Pick<CoachUsage, "syntactic_calls" | "semantic_calls"> | null | undefined
): number {
  return u?.syntactic_calls ?? 0;
}
