import { z } from "zod";
import {
  entitySchema,
  courseInput,
  subjectInput,
  moduleInput,
  examInput,
  settingsInput,
} from "@memocycle/contracts";
export const courseSchema = entitySchema
  .merge(courseInput)
  .extend({
    status: z.enum(["draft", "active", "completed", "archived"]),
    studiedAt: z.string().nullable(),
  });
export const subjectSchema = entitySchema.merge(subjectInput);
export const moduleSchema = entitySchema.merge(moduleInput);
export const examSchema = entitySchema.merge(examInput);
export const settingsSchema = entitySchema.merge(settingsInput);
export const planSchema = entitySchema.extend({
  courseId: z.string(),
  currentStep: z.number(),
  intervalsJson: z.array(z.number()),
  scheduleVersion: z.number(),
  nextReviewAt: z.string().nullable(),
  startedAt: z.string(),
  lastReviewedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  status: z.string(),
});
export const eventSchema = entitySchema.extend({
  courseId: z.string(),
  reviewPlanId: z.string(),
  cycle: z.number(),
  kind: z.string(),
  stepIndex: z.number().nullable(),
  scheduledAt: z.string().nullable(),
  completedAt: z.string(),
  delayMinutes: z.number(),
});
export type Course = z.infer<typeof courseSchema>;
export type Plan = z.infer<typeof planSchema>;
