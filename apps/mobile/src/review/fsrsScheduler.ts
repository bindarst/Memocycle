import {
  calculateAdaptiveReview,
  calculateRetrievability,
  type MemoryState,
} from "@memocycle/contracts";
import type { Plan } from "../database/entities";

export { calculateAdaptiveReview, calculateRetrievability };

export function planToMemoryState(plan: Plan, now = new Date()): Partial<MemoryState> {
  const lastReview = plan.lastReviewedAt ? new Date(plan.lastReviewedAt) : new Date(plan.startedAt);
  const elapsedDays = Math.max(0, Math.floor((now.getTime() - lastReview.getTime()) / 86_400_000));

  return {
    difficulty: plan.difficulty ?? undefined,
    stability: plan.stability ?? undefined,
    retrievability: plan.retrievability ?? undefined,
    scheduledDays: plan.scheduledDays ?? undefined,
    elapsedDays: plan.elapsedDays ?? elapsedDays,
    reps: plan.reps ?? (plan.currentStep > 1 ? plan.currentStep - 1 : 0),
    lapses: plan.lapses ?? 0,
    lastReviewDate: plan.lastReviewedAt ?? plan.startedAt,
  };
}

export function estimatePlanRetention(plan: Plan, at = Date.now()): number {
  if (plan.status !== "active") return 1;
  const lastReviewTime = new Date(plan.lastReviewedAt ?? plan.startedAt).getTime();
  const elapsedDays = Math.max(0, (at - lastReviewTime) / 86_400_000);

  if (plan.schedulerType === "fsrs" && plan.stability && plan.stability > 0) {
    return calculateRetrievability(plan.stability, elapsedDays, plan.desiredRetention ?? 0.9);
  }

  // Classic fallback model
  const intervalMs = plan.nextReviewAt
    ? Math.max(3_600_000, new Date(plan.nextReviewAt).getTime() - lastReviewTime)
    : 30 * 86_400_000;
  const elapsedMs = Math.max(0, at - lastReviewTime);
  const retention = Math.exp(Math.log(0.9) * (elapsedMs / intervalMs));
  return Math.max(0.05, Math.min(1, retention));
}

export function formatRetentionPercentage(retention: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, retention)) * 100);
  return `${pct} %`;
}
