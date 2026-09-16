import type { LearningStage } from "@memocycle/contracts";
import type { Plan } from "../database/entities";

/**
 * Computes an advisory learning stage for a course based on its FSRS plan metrics.
 * Note: This computation is purely observational and does NOT alter FSRS formulas.
 */
export function determineLearningStage(plan?: Plan | null): LearningStage {
  if (!plan) return "acquisition";

  if (plan.status === "completed") {
    return "mastery";
  }

  const reps = plan.reps ?? 0;
  const lapses = plan.lapses ?? 0;
  const stability = plan.stability ?? 0;

  // Recent lapse or brand new
  if (reps === 0 || (lapses > 0 && plan.lastRating === "again")) {
    return "acquisition";
  }

  // Very high stability (> 30 days) or step >= 5
  if (stability >= 30 || plan.currentStep >= 5) {
    return "mastery";
  }

  // Consolidating intermediate phase
  if (reps <= 2 || stability < 7) {
    return "consolidation";
  }

  // Active retrieval phase
  return "retrieval";
}
