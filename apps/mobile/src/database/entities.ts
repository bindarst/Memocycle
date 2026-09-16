import { z } from "zod";
import {
  entitySchema,
  courseInput,
  subjectInput,
  moduleInput,
  examInput,
  settingsInput,
  studyItemTypeSchema,
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

export const studyItemSchema = entitySchema.extend({
  courseId: z.string().uuid(),
  type: studyItemTypeSchema,
  front: z.string().nullable().default(null),
  back: z.string().nullable().default(null),
  hint: z.string().nullable().default(null),
  position: z.number().int().min(0).default(0),
  archivedAt: z.string().nullable().default(null),
});

export const planSchema = entitySchema.extend({
  courseId: z.string(),
  schedulerType: z.enum(["classic", "fsrs"]).default("classic"),
  currentStep: z.number(),
  intervalsJson: z.array(z.number()),
  scheduleVersion: z.number(),
  nextReviewAt: z.string().nullable(),
  startedAt: z.string(),
  lastReviewedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  status: z.string(),
  desiredRetention: z.number().default(0.9),
  difficulty: z.number().nullable().optional(),
  stability: z.number().nullable().optional(),
  retrievability: z.number().nullable().optional(),
  scheduledDays: z.number().nullable().optional(),
  elapsedDays: z.number().nullable().optional(),
  reps: z.number().default(0),
  lapses: z.number().default(0),
  lastRating: z.string().nullable().optional(),
});

import {
  studySessionSchema,
  studyMethodSchema,
  reviewSessionTypeSchema,
  type StudySession as StudySessionContract,
} from "@memocycle/contracts";

export const studySessionEntitySchema = studySessionSchema;
export type StudySession = StudySessionContract;

export const eventSchema = entitySchema.extend({
  courseId: z.string(),
  reviewPlanId: z.string(),
  cycle: z.number(),
  kind: z.string(),
  stepIndex: z.number().nullable(),
  scheduledAt: z.string().nullable(),
  completedAt: z.string(),
  delayMinutes: z.number(),
  confidence: z.string().nullable().optional(),
  deviceId: z.string().nullable().optional(),
  durationSeconds: z.number().int().min(0).nullable().optional(),
  sessionType: reviewSessionTypeSchema.nullable().optional(),
  studyMethod: studyMethodSchema.nullable().optional(),
});

export type Course = z.infer<typeof courseSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type Module = z.infer<typeof moduleSchema>;
export type Plan = z.infer<typeof planSchema>;
export type ReviewEvent = z.infer<typeof eventSchema>;
export type StudyItem = z.infer<typeof studyItemSchema>;
export type Exam = z.infer<typeof examSchema>;
export type Settings = z.infer<typeof settingsSchema>;


