export const CLASSIC_REVIEW_INTERVALS_HOURS = [
  24, 72, 168, 336, 720, 1440,
] as const;
export type SchedulerType = "classic" | "fsrs";
export function calculateNextReviewAt(
  completedAt: Date,
  nextStepIndex: number,
  intervalsHours: readonly number[],
): Date | null {
  if (!Number.isFinite(completedAt.getTime()))
    throw new Error("Invalid completion date");
  if (
    !Number.isInteger(nextStepIndex) ||
    nextStepIndex < 0 ||
    nextStepIndex > intervalsHours.length
  )
    throw new Error("Invalid step");
  if (
    intervalsHours.length === 0 ||
    intervalsHours.some((h) => !Number.isFinite(h) || h <= 0)
  )
    throw new Error("Invalid intervals");
  if (nextStepIndex === intervalsHours.length) return null;
  const hours = intervalsHours[nextStepIndex]!;
  const result = new Date(completedAt.getTime() + hours * 3_600_000);
  if (!Number.isFinite(result.getTime())) throw new Error("Date overflow");
  return result;
}
