import { z } from "zod";
export const title = z.string().trim().min(1).max(100);
const description = z.string().max(2000).nullable().default(null);
export const subjectInput = z
  .object({
    title,
    description,
    iconKey: z
      .enum(["book", "science", "language", "math"])
      .nullable()
      .default(null),
    colorKey: z
      .enum(["blue", "green", "amber", "slate"])
      .nullable()
      .default(null),
    position: z.number().int().min(0).default(0),
    archivedAt: z.string().datetime().nullable().default(null),
  })
  .strict();
export const moduleInput = z
  .object({
    title,
    description,
    subjectId: z.string().uuid(),
    position: z.number().int().min(0).default(0),
    archivedAt: z.string().datetime().nullable().default(null),
  })
  .strict();
import {
  contentTypeSchema,
  methodSelectionModeSchema,
  priorKnowledgeSchema,
  studyMethodSchema,
} from "./studyMethod";

export const courseAttachmentTypeSchema = z.enum([
  "pdf",
  "image",
  "link",
  "audio",
]);
export type CourseAttachmentType = z.infer<typeof courseAttachmentTypeSchema>;

export const courseAttachmentSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  type: courseAttachmentTypeSchema,
  title: z.string().trim().min(1).max(150),
  url: z.string().url(),
  createdAt: z.string().datetime(),
});
export type CourseAttachment = z.infer<typeof courseAttachmentSchema>;

export const courseInput = z
  .object({
    title,
    description,
    subjectId: z.string().uuid(),
    moduleId: z.string().uuid().nullable().default(null),
    estimatedReviewMinutes: z.number().int().min(1).max(600).default(10),
    importance: z.number().int().min(1).max(3).default(2),
    preferredStudyMethod: studyMethodSchema.nullable().default(null),
    methodSelectionMode: methodSelectionModeSchema.default("automatic"),
    contentType: contentTypeSchema.default("mixed"),
    priorKnowledge: priorKnowledgeSchema.default("none"),
    targetDate: z.string().datetime().nullable().default(null),
    weeklyStudyTargetMinutes: z.number().int().min(1).max(10000).nullable().default(null),
    priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
    examIds: z.array(z.string().uuid()).default([]),
    tags: z.array(z.string().trim().max(50)).default([]),
    archivedAt: z.string().datetime().nullable().default(null),
  })
  .strict();
export const examInput = z
  .object({
    title,
    subjectId: z.string().uuid(),
    moduleId: z.string().uuid().nullable().default(null),
    examAt: z.string().datetime(),
    notes: description,
  })
  .strict();
export const settingsInput = z
  .object({
    dailyStudyMinutes: z.union([
      z.literal(15),
      z.literal(30),
      z.literal(45),
      z.literal(60),
      z.literal(90),
      z.literal(120),
      z.null(),
    ]),
    remindersEnabled: z.boolean(),
    soundEnabled: z.boolean(),
    vibrationEnabled: z.boolean(),
    morningSummary: z.boolean(),
    appearance: z.enum(["system", "light", "dark"]),
    onboardingCompleted: z.boolean(),
    preferredStudyTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable()
      .default(null),
    quietHoursStart: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable()
      .default(null),
    quietHoursEnd: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable()
      .default(null),
    morningSummaryTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable()
      .default(null),
    overdueRemindersEnabled: z.boolean().default(true),
    examRemindersEnabled: z.boolean().default(true),
    desiredRetention: z.number().min(0.8).max(0.97).default(0.9),
  })
  .strict();
