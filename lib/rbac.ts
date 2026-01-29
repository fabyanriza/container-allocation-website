// Role definitions and permissions
export type UserRole = "superadmin" | "depot_manager" | "operator"

export interface Permission {
  resource: string
  action: "create" | "read" | "update" | "delete" | "view"
}

export interface RoleConfig {
  role: UserRole
  label: string
  description: string
  permissions: Permission[]
}

// Define permissions for each role
export const roleConfigs: Record<UserRole, RoleConfig> = {
  superadmin: {
    role: "superadmin",
    label: "Super Admin",
    description: "Full system access and user management",
    permissions: [
      // Users
      { resource: "users", action: "create" },
      { resource: "users", action: "read" },
      { resource: "users", action: "update" },
      { resource: "users", action: "delete" },
      
      // Depots
      { resource: "depots", action: "create" },
      { resource: "depots", action: "read" },
      { resource: "depots", action: "update" },
      { resource: "depots", action: "delete" },
      
      // Containers
      { resource: "containers", action: "create" },
      { resource: "containers", action: "read" },
      { resource: "containers", action: "update" },
      { resource: "containers", action: "delete" },
      
      // Allocations
      { resource: "allocations", action: "create" },
      { resource: "allocations", action: "read" },
      { resource: "allocations", action: "update" },
      { resource: "allocations", action: "delete" },
      
      // Discharge
      { resource: "discharge", action: "create" },
      { resource: "discharge", action: "read" },
      { resource: "discharge", action: "update" },
      { resource: "discharge", action: "delete" },
      
      // Reports & Analytics
      { resource: "reports", action: "create" },
      { resource: "reports", action: "read" },
      { resource: "reports", action: "update" },
      { resource: "reports", action: "delete" },
      
      // Activity logs
      { resource: "activity_logs", action: "read" },
      { resource: "activity_logs", action: "delete" },
    ],
  },

  depot_manager: {
    role: "depot_manager",
    label: "Depot Manager",
    description: "Manage depot operations and containers",
    permissions: [
      // Users - read only (view team)
      { resource: "users", action: "read" },
      
      // Depots - read and update own depot
      { resource: "depots", action: "read" },
      { resource: "depots", action: "update" },
      
      // Containers
      { resource: "containers", action: "create" },
      { resource: "containers", action: "read" },
      { resource: "containers", action: "update" },
      
      // Allocations
      { resource: "allocations", action: "create" },
      { resource: "allocations", action: "read" },
      { resource: "allocations", action: "update" },
      
      // Discharge
      { resource: "discharge", action: "create" },
      { resource: "discharge", action: "read" },
      { resource: "discharge", action: "update" },
      
      // Reports - read only
      { resource: "reports", action: "read" },
      
      // Activity logs - read own
      { resource: "activity_logs", action: "read" },
    ],
  },

  operator: {
    role: "operator",
    label: "Operator",
    description: "Perform daily operations",
    permissions: [
      // Users - cannot manage
      // { resource: "users", action: "read" },
      
      // Depots - read only
      { resource: "depots", action: "read" },
      
      // Containers - read and create
      { resource: "containers", action: "create" },
      { resource: "containers", action: "read" },
      
      // Allocations - create and read
      { resource: "allocations", action: "create" },
      { resource: "allocations", action: "read" },
      
      // Discharge - can update status
      { resource: "discharge", action: "read" },
      { resource: "discharge", action: "update" },
      
      // Reports - read only
      { resource: "reports", action: "read" },
      
      // Activity logs - read own only
      { resource: "activity_logs", action: "read" },
    ],
  },
}

/**
 * Check if a role has permission for a resource action
 */
export function hasPermission(
  role: UserRole | null,
  resource: string,
  action: "create" | "read" | "update" | "delete" | "view",
): boolean {
  if (!role) return false

  const config = roleConfigs[role]
  if (!config) return false

  return config.permissions.some((p) => p.resource === resource && p.action === action)
}

/**
 * Check if user can perform action on resource
 */
export function canAccess(
  role: UserRole | null,
  resource: string,
  action: "create" | "read" | "update" | "delete" | "view" = "read",
): boolean {
  return hasPermission(role, resource, action)
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return roleConfigs[role]?.permissions || []
}

/**
 * Get all accessible resources for a role
 */
export function getAccessibleResources(role: UserRole | null): string[] {
  if (!role) return []

  const config = roleConfigs[role]
  if (!config) return []

  return [...new Set(config.permissions.map((p) => p.resource))]
}

/**
 * Get role label
 */
export function getRoleLabel(role: UserRole): string {
  return roleConfigs[role]?.label || role
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  return roleConfigs[role]?.description || ""
}
