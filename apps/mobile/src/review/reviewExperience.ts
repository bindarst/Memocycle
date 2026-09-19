import type { ReviewRating } from "@memocycle/contracts";

export const REVIEW_RATING_COPY: Record<
  ReviewRating,
  { label: string; description: string }
> = {
  again: { label: "Oublié", description: "Je n’ai pas retrouvé la réponse" },
  hard: { label: "Difficile", description: "Retrouvée avec beaucoup d’effort" },
  good: { label: "Bien", description: "Retrouvée correctement" },
  easy: { label: "Facile", description: "Réponse immédiate et sûre" },
};

export function reviewSessionScore(ratings: ReviewRating[]): number {
  if (!ratings.length) return 0;
  const points: Record<ReviewRating, number> = {
    again: 0,
    hard: 45,
    good: 80,
    easy: 100,
  };
  return Math.round(
    ratings.reduce((total, rating) => total + points[rating], 0) /
      ratings.length,
  );
}

export function formatSessionDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return minutes > 0 ? `${minutes} min ${remainder.toString().padStart(2, "0")}` : `${remainder} s`;
}
