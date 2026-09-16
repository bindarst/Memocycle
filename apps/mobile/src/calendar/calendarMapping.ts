import type {
  CalendarEventType,
  UnifiedCalendarEvent,
} from "@memocycle/contracts";
import type { Plan } from "../database/entities";

export interface SourceOfTruthRule {
  entityType: CalendarEventType;
  sourceOfTruth: "memocycle" | "external";
  canExternalUpdateSchedule: boolean;
}

export const CALENDAR_SOURCE_OF_TRUTH_RULES: Record<
  CalendarEventType,
  SourceOfTruthRule
> = {
  review: {
    entityType: "review",
    sourceOfTruth: "memocycle",
    canExternalUpdateSchedule: true,
  },
  exam: {
    entityType: "exam",
    sourceOfTruth: "memocycle",
    canExternalUpdateSchedule: false,
  },
  study_session: {
    entityType: "study_session",
    sourceOfTruth: "memocycle",
    canExternalUpdateSchedule: true,
  },
  external: {
    entityType: "external",
    sourceOfTruth: "external",
    canExternalUpdateSchedule: true,
  },
};

export function canExternalUpdateFsrsState(): boolean {
  return false;
}

export function canExternalUpdateSchedule(
  syncMode: "disabled" | "export_only" | "two_way",
): boolean {
  return syncMode === "two_way";
}

export function mapExternalToUnavailableSlot(
  event: UnifiedCalendarEvent,
): { startAt: string; endAt: string; busy: boolean } {
  return {
    startAt: event.startAt,
    endAt: event.endAt,
    busy: event.busy ?? true,
  };
}

/**
 * Ensures strict invariance: An external update can ONLY modify `scheduledAt`.
 * It is strictly forbidden to alter FSRS memory parameters:
 * difficulty, stability, retrievability, reps, lapses, rating, or learning history.
 */
export function applyExternalScheduleAdjustment(
  existingPlan: Plan,
  newScheduledAtIso: string,
  userAllowsExternalAdjustment = true,
): Plan {
  if (!userAllowsExternalAdjustment) {
    return existingPlan;
  }

  // Validate ISO string
  const parsed = new Date(newScheduledAtIso);
  if (isNaN(parsed.getTime())) {
    return existingPlan;
  }

  // Preserve all FSRS parameters strictly intact
  return {
    ...existingPlan,
    nextReviewAt: parsed.toISOString(),
    updatedAt: new Date().toISOString(),
    version: existingPlan.version + 1,
    // INVARIANTS PRESERVED:
    difficulty: existingPlan.difficulty,
    stability: existingPlan.stability,
    retrievability: existingPlan.retrievability,
    desiredRetention: existingPlan.desiredRetention,
    currentStep: existingPlan.currentStep,
    scheduleVersion: existingPlan.scheduleVersion,
    intervalsJson: existingPlan.intervalsJson,
    reps: existingPlan.reps,
    lapses: existingPlan.lapses,
    lastRating: existingPlan.lastRating,
  };
}
