import { z } from "zod";
import { studyMethodSchema } from "./studyMethod";

export const reviewRatingSchema = z.enum(["again", "hard", "good", "easy"]);

export const reviewSessionTypeSchema = z.enum([
  "scheduled_review",
  "voluntary_review",
  "study",
]);
export type ReviewSessionType = z.infer<typeof reviewSessionTypeSchema>;

export const reviewCommandSchema = z
  .object({
    command: z.enum(["start", "complete", "restart"]),
    courseId: z.string().uuid(),
    reviewPlanId: z.string().uuid(),
    eventId: z.string().uuid(),
    completedAt: z.string().datetime(),
    stepIndex: z.number().int().min(0).max(6),
    cycle: z.number().int().min(1),
    rating: reviewRatingSchema.optional(),
    desiredRetention: z.number().min(0.8).max(0.97).optional(),
    durationSeconds: z.number().int().min(0).optional(),
    sessionType: reviewSessionTypeSchema.default("scheduled_review").optional(),
    studyMethod: studyMethodSchema.optional(),
  })
  .strict();
export type ReviewCommand = z.infer<typeof reviewCommandSchema>;
