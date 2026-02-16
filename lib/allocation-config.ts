/**
 * Allocation Configuration
 * Customize depot allocation behavior and capacity management rules
 */

export const ALLOCATION_CONFIG = {
  /**
   * Capacity management thresholds (in percentage)
   *
   * Strategy:
   * - target_min (60%): Depots below this are underutilized
   * - target_max (80%): Preferred maximum to keep flexibility
   * - warning (85%): Alert level, but still acceptable
   * - critical (95%): Avoid new allocations here
   */
  capacity: {
    // Ideal range: 60-80% for balanced utilization
    target_min: 0.6,
    target_max: 0.8,
    warning: 0.85,
    critical: 0.95,
  },

  /**
   * Container Grade Preferences
   * Maps depot names to acceptable container grades (A=premium, B=standard, C=regular)
   *
   * Usage: When grade is specified, only depots that accept that grade are considered
   */
  gradePreference: {
    "Depo 4": ["A", "B"], // Premium & standard only
    "Depo Japfa": ["B", "C", "A"], // All grades accepted (flexible)
    "Depo Teluk Bayur": ["C", "B"], // Standard & regular
    "Depo Yon": ["B", "C"], // Standard & regular
  },

  /**
   * Activity & Logistics Rules
   * Defines preferred depot chains based on activity type and logistics requirement
   *
   * Rule 1: Stuffing/Stripping OUTSIDE + No Logistics
   *         Preference: Yon → Japfa → Teluk Bayur
   *
   * Rule 2: Stuffing/Stripping INSIDE + No Logistics
   *         Preference: Japfa → Teluk Bayur
   *
   * Rule 3: Stuffing/Stripping INSIDE + Logistics YES
   *         Preference: Depo 4
   *
   * Rule 4 (Outside + Logistics): Use Default (max available)
   */
  activityRules: {
    outside_no_logistics: ["Yon", "Japfa", "Teluk Bayur"],
    inside_no_logistics: ["Japfa", "Teluk Bayur"],
    inside_with_logistics: ["Depo 4"],
    default: "max_available",
  },

  /**
   * Allocation priorities for conflict resolution
   * When multiple depots are suitable, use this order
   */
  selectionPriority: [
    "rule_match", // Prefer matched rule depot first
    "optimal_range", // Then in optimal range (60-80%)
    "grade_compatibility", // Then grade compatible
    "max_availability", // Finally highest available capacity
  ],

  /**
   * Enable/disable specific features
   */
  features: {
    grade_aware_allocation: true, // Consider container grade
    capacity_range_enforcement: true, // Enforce 60-80% range
    critical_capacity_avoidance: true, // Never allocate to 95%+ depots
  },
} as const;

/**
 * Helper function to get depot grade preferences
 * @param depotName - The depot name to check
 * @returns Array of acceptable grades, or empty array if not found
 */
export function getDepotGradePreferences(depotName: string): string[] {
  const entry = Object.entries(ALLOCATION_CONFIG.gradePreference).find(
    ([name]) => depotName.toLowerCase().includes(name.toLowerCase()),
  );
  return entry ? [...entry[1]] : [];
}

/**
 * @param depotName - The depot name
 * @param grade - The container grade to check
 * @returns true if the depot accepts this grade (or grade is not specified)
 */
export function isGradeAccepted(depotName: string, grade?: string): boolean {
  if (!grade) return true;
  const accepted = getDepotGradePreferences(depotName);
  if (accepted.length === 0) return true; // Unknown depot, accept any grade
  return accepted.includes(grade.toUpperCase());
}

/**
 * Calculate capacity utilization percentage
 */
export function getUtilizationPercent(used: number, capacity: number): number {
  if (capacity <= 0) return 100;
  return (used / capacity) * 100;
}

/**
 * Check if capacity utilization is in optimal range
 */
export function isInOptimalRange(utilization: number): boolean {
  return (
    utilization >= ALLOCATION_CONFIG.capacity.target_min * 100 &&
    utilization <= ALLOCATION_CONFIG.capacity.target_max * 100
  );
}

/**
 * Check if capacity is critical (should avoid new allocations)
 */
export function isCritical(utilization: number): boolean {
  return utilization >= ALLOCATION_CONFIG.capacity.critical * 100;
}

/**
 * Check if capacity exceeds recommended maximum
 */
export function exceedsMaxRecommended(utilization: number): boolean {
  return utilization > ALLOCATION_CONFIG.capacity.target_max * 100;
}
