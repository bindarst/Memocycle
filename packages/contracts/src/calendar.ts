import { z } from "zod";
import { studyMethodSchema } from "./studyMethod";

export const calendarProviderSchema = z.enum(["google", "microsoft", "device"]);
export type CalendarProvider = z.infer<typeof calendarProviderSchema>;

export const calendarSyncModeSchema = z.enum(["disabled", "export_only", "two_way"]);
export type CalendarSyncMode = z.infer<typeof calendarSyncModeSchema>;

export const calendarEventTypeSchema = z.enum([
  "review",
  "exam",
  "study_session",
  "external",
]);
export type CalendarEventType = z.infer<typeof calendarEventTypeSchema>;

export const calendarConnectionSchema = z
  .object({
    id: z.string().uuid(),
    provider: calendarProviderSchema,
    accountLabel: z.string().max(255),
    syncMode: calendarSyncModeSchema,
    calendarId: z.string().nullable().default(null),
    enabled: z.boolean().default(true),
    lastSyncAt: z.string().datetime().nullable().default(null),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export type CalendarConnection = z.infer<typeof calendarConnectionSchema>;

export const calendarEventLinkSchema = z
  .object({
    id: z.string().uuid(),
    provider: calendarProviderSchema,
    localEntityType: z.enum(["review", "exam", "study_session"]),
    localEntityId: z.string().uuid(),
    externalEventId: z.string(),
    externalCalendarId: z.string(),
    lastSyncedAt: z.string().datetime(),
    externalUpdatedAt: z.string().datetime().nullable().default(null),
  })
  .strict();
export type CalendarEventLink = z.infer<typeof calendarEventLinkSchema>;

export const studySessionStatusSchema = z.enum([
  "planned",
  "completed",
  "cancelled",
]);
export type StudySessionStatus = z.infer<typeof studySessionStatusSchema>;

export const studySessionSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    courseId: z.string().uuid(),
    plannedStartAt: z.string().datetime(),
    plannedEndAt: z.string().datetime(),
    actualStartAt: z.string().datetime().nullable().default(null),
    actualEndAt: z.string().datetime().nullable().default(null),
    method: studyMethodSchema.nullable().default(null),
    status: studySessionStatusSchema.default("planned"),
    version: z.number().int().default(1),
    updatedAt: z.string().datetime(),
    createdAt: z.string().datetime().optional(),
    deletedAt: z.string().datetime().nullable().default(null),
  })
  .strict();
export type StudySession = z.infer<typeof studySessionSchema>;

export const unifiedCalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  type: calendarEventTypeSchema,
  courseId: z.string().uuid().optional(),
  examId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  isAllDay: z.boolean().default(false),
  sourceProvider: calendarProviderSchema.optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  busy: z.boolean().default(true),
});
export type UnifiedCalendarEvent = z.infer<typeof unifiedCalendarEventSchema>;

export const studyAvailabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6), // 0: Sunday, 1: Monday, ... 6: Saturday
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});
export type StudyAvailabilitySlot = z.infer<typeof studyAvailabilitySlotSchema>;

export const studyAvailabilitySchema = z.object({
  mode: z.enum(["morning", "afternoon", "evening", "custom"]),
  slots: z.array(studyAvailabilitySlotSchema).default([]),
});
export type StudyAvailability = z.infer<typeof studyAvailabilitySchema>;

/**
 * Format an ISO Date or Date object into ICS iCalendar RFC 5545 date string format: YYYYMMDDTHHMMSSZ
 */
function toIcsDate(dateInput: string | Date): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Generates an RFC 5545 compliant iCalendar (.ics) string.
 */
export function generateIcsCalendar(
  events: Array<{
    uid?: string;
    id?: string;
    summary?: string;
    title?: string;
    description?: string;
    startAt: string | Date;
    endAt: string | Date;
    url?: string;
    type?: string;
  }>,
  calendarName = "MémoCycle Planning",
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MémoCycle//Study Assistant//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calendarName}`,
    "X-WR-TIMEZONE:UTC",
  ];

  const nowIcs = toIcsDate(new Date());

  for (const event of events) {
    const uid = event.uid ?? event.id ?? `evt_${Math.random().toString(36).slice(2, 9)}`;
    const rawSummary = event.summary ?? event.title ?? "Événement MémoCycle";
    const summary = rawSummary.replace(/[\r\n]+/g, " ");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}@memocycle.app`);
    lines.push(`DTSTAMP:${nowIcs}`);
    lines.push(`DTSTART:${toIcsDate(event.startAt)}`);
    lines.push(`DTEND:${toIcsDate(event.endAt)}`);
    lines.push(`SUMMARY:${summary}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${event.description.replace(/[\r\n]+/g, " ")}`);
    }
    if (event.url) {
      lines.push(`URL:${event.url}`);
    }
    lines.push("STATUS:CONFIRMED");
    lines.push("TRANSP:OPAQUE");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
