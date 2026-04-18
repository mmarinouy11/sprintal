import { OrgRole } from "@/types";

/**
 * Permisos por rol.
 * viewer  — solo lectura
 * editor  — puede crear/editar bets, signal checks, reviews
 * admin   — todo + settings
 * owner   — todo
 */
const PERMISSIONS = {
  canCreateSprint:   ["owner", "admin"] as OrgRole[],
  canCreateBet:      ["owner", "admin", "editor"] as OrgRole[],
  canSignalCheck:    ["owner", "admin", "editor"] as OrgRole[],
  canReview:         ["owner", "admin", "editor"] as OrgRole[],
  canCloseSprint:    ["owner", "admin"] as OrgRole[],
  canEditSettings:   ["owner", "admin"] as OrgRole[],
  canCreateSubOrg:   ["owner"] as OrgRole[],
  canViewDashboard:  ["owner", "admin", "editor", "viewer"] as OrgRole[],
};

export type Permission = keyof typeof PERMISSIONS;

export function can(role: OrgRole | null, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as OrgRole[]).includes(role);
}

export function usePermissions(role: OrgRole | null) {
  return {
    canCreateSprint:  can(role, "canCreateSprint"),
    canCreateBet:     can(role, "canCreateBet"),
    canSignalCheck:   can(role, "canSignalCheck"),
    canReview:        can(role, "canReview"),
    canCloseSprint:   can(role, "canCloseSprint"),
    canEditSettings:  can(role, "canEditSettings"),
    canCreateSubOrg:  can(role, "canCreateSubOrg"),
    canViewDashboard: can(role, "canViewDashboard"),
  };
}
