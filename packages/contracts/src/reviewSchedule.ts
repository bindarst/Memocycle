import {
  fsrs,
  generatorParameters,
  Rating,
  createEmptyCard,
  State,
  type Card,
} from "ts-fsrs";

export const CLASSIC_REVIEW_INTERVALS_HOURS = [
  24, 72, 168, 336, 720, 1440,
] as const;

export type SchedulerType = "classic" | "fsrs";

export type ReviewRating = "again" | "hard" | "good" | "easy";

export type MemoryState = {
  difficulty: number;
  stability: number;
  retrievability: number;
  scheduledDays: number;
  elapsedDays: number;
  reps: number;
  lapses: number;
  lastReviewDate?: string | null;
};

export interface AdaptiveReviewInput {
  completedAt: Date;
  rating: ReviewRating;
  previousState?: Partial<MemoryState> | null;
  desiredRetention?: number;
}

export interface AdaptiveReviewResult {
  nextReviewAt: Date;
  memoryState: MemoryState;
}

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

const ratingMap: Record<ReviewRating, Rating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export function calculateAdaptiveReview({
  completedAt,
  rating,
  previousState,
  desiredRetention = 0.9,
}: AdaptiveReviewInput): AdaptiveReviewResult {
  if (!Number.isFinite(completedAt.getTime()))
    throw new Error("Invalid completion date");
  if (!ratingMap[rating])
    throw new Error(`Invalid rating: ${rating}`);

  const retention = Math.max(0.8, Math.min(0.97, desiredRetention ?? 0.9));
  const params = generatorParameters({
    request_retention: retention,
    enable_fuzz: false,
    enable_short_term: false,
  });
  const f = fsrs(params);

  let card: Card;
  if (!previousState || typeof previousState.reps !== "number" || previousState.reps <= 0) {
    card = createEmptyCard(completedAt);
  } else {
    const lastReview = previousState.lastReviewDate
      ? new Date(previousState.lastReviewDate)
      : new Date(completedAt.getTime() - Math.max(0, previousState.elapsedDays ?? 0) * 86_400_000);

    card = {
      due: completedAt,
      stability: previousState.stability ?? 0,
      difficulty: previousState.difficulty ?? 0,
      elapsed_days: previousState.elapsedDays ?? 0,
      scheduled_days: previousState.scheduledDays ?? 0,
      reps: previousState.reps ?? 0,
      lapses: previousState.lapses ?? 0,
      state: State.Review,
      last_review: lastReview,
      learning_steps: 0,
    };
  }

  const record = f.repeat(card, completedAt);
  const nextCard = record[ratingMap[rating]].card;
  const retrievabilityRaw = f.get_retrievability(nextCard, completedAt, false);
  const retrievability = typeof retrievabilityRaw === "number" && Number.isFinite(retrievabilityRaw)
    ? retrievabilityRaw
    : 1;

  return {
    nextReviewAt: nextCard.due,
    memoryState: {
      difficulty: Number(nextCard.difficulty.toFixed(4)),
      stability: Number(nextCard.stability.toFixed(4)),
      retrievability: Number(retrievability.toFixed(4)),
      scheduledDays: nextCard.scheduled_days,
      elapsedDays: nextCard.elapsed_days,
      reps: nextCard.reps,
      lapses: nextCard.lapses,
      lastReviewDate: completedAt.toISOString(),
    },
  };
}

export function calculateRetrievability(
  stability: number,
  elapsedDays: number,
  desiredRetention = 0.9,
): number {
  if (stability <= 0 || elapsedDays <= 0) return 1;
  const retention = Math.max(0.8, Math.min(0.97, desiredRetention));
  const params = generatorParameters({ request_retention: retention });
  const f = fsrs(params);
  const r = f.forgetting_curve(elapsedDays, stability);
  return Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : 1;
}

