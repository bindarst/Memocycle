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
export const courseInput = z
  .object({
    title,
    description,
    subjectId: z.string().uuid(),
    moduleId: z.string().uuid().nullable().default(null),
    estimatedReviewMinutes: z.number().int().min(1).max(600).default(10),
    importance: z.number().int().min(1).max(3).default(2),
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
