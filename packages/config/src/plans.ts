export type SubscriptionTier = "free" | "pro";
export interface Entitlements {
  unlimitedSubjects: boolean;
  unlimitedCourses: boolean;
  multiDeviceSync: boolean;
  advancedStats: boolean;
  exports: boolean;
}
// V1 has no billing or artificial quotas. Change only alongside server-side entitlement enforcement.
export const FREE_PLAN = {
  maxSubjects: null,
  maxActiveCourses: null,
  multiDeviceSync: true,
  advancedStats: false,
  exports: false,
} as const;
