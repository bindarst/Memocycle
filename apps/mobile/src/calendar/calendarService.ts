import {
  generateIcsCalendar,
  type CalendarEventType,
  type StudyAvailability,
  type UnifiedCalendarEvent,
} from "@memocycle/contracts";
import type { Course, Exam, Plan, StudySession } from "../database/entities";

export interface CalendarConflict {
  eventId: string;
  eventTitle: string;
  eventType: CalendarEventType;
  startAt: string;
  endAt: string;
  conflictingWith: {
    externalId: string;
    externalTitle: string;
    startAt: string;
    endAt: string;
    sourceProvider?: string;
  };
}

export interface AlternativeSlotProposal {
  startAt: string;
  endAt: string;
  label: string;
  fitsPreferredTime: boolean;
}

/**
 * Detects time overlaps between MémoCycle scheduled items (reviews, study sessions) and busy external calendar events.
 */
export function detectCalendarConflicts(
  localItems: Array<{
    id: string;
    title: string;
    type: CalendarEventType;
    startAt: string;
    endAt: string;
  }>,
  externalEvents: UnifiedCalendarEvent[],
): CalendarConflict[] {
  const conflicts: CalendarConflict[] = [];

  for (const item of localItems) {
    const itemStart = new Date(item.startAt).getTime();
    const itemEnd = new Date(item.endAt).getTime();

    if (isNaN(itemStart) || isNaN(itemEnd) || itemEnd <= itemStart) continue;

    for (const ext of externalEvents) {
      if (!ext.busy || ext.isAllDay) continue;

      const extStart = new Date(ext.startAt).getTime();
      const extEnd = new Date(ext.endAt).getTime();

      if (isNaN(extStart) || isNaN(extEnd)) continue;

      // Overlap condition: startA < endB && endA > startB
      if (itemStart < extEnd && itemEnd > extStart) {
        conflicts.push({
          eventId: item.id,
          eventTitle: item.title,
          eventType: item.type,
          startAt: item.startAt,
          endAt: item.endAt,
          conflictingWith: {
            externalId: ext.id,
            externalTitle: ext.title,
            startAt: ext.startAt,
            endAt: ext.endAt,
            sourceProvider: ext.sourceProvider,
          },
        });
        break; // One primary conflict per item is sufficient for user alert
      }
    }
  }

  return conflicts;
}

/**
 * Proposes free alternative study slots respecting preferred study time and user availability.
 * Never moves an event automatically without explicit user confirmation.
 */
export function suggestAlternativeStudySlots(
  conflict: CalendarConflict,
  allEvents: UnifiedCalendarEvent[],
  preferredStudyTime: string | null = "18:00",
  slotDurationMinutes = 30,
): AlternativeSlotProposal[] {
  const proposals: AlternativeSlotProposal[] = [];
  const baseDate = new Date(conflict.startAt);

  const durationMs = slotDurationMinutes * 60 * 1000;
  const preferredHour = preferredStudyTime ? parseInt(preferredStudyTime.split(":")[0] ?? "18", 10) : 18;
  const preferredMinute = preferredStudyTime ? parseInt(preferredStudyTime.split(":")[1] ?? "0", 10) : 0;

  // Candidate offsets: +1h, +2h, preferred time today, next morning at 09:00
  const candidateTimes: Date[] = [];

  // Candidate 1: 1 hour later
  const plusOneHour = new Date(new Date(conflict.endAt).getTime() + 15 * 60 * 1000);
  candidateTimes.push(plusOneHour);

  // Candidate 2: Preferred time on the same day
  const sameDayPref = new Date(baseDate);
  sameDayPref.setHours(preferredHour, preferredMinute, 0, 0);
  if (sameDayPref.getTime() > Date.now()) {
    candidateTimes.push(sameDayPref);
  }

  // Candidate 3: Next day same hour
  const nextDay = new Date(baseDate);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(preferredHour, preferredMinute, 0, 0);
  candidateTimes.push(nextDay);

  // Candidate 4: Next day 10:00 AM
  const nextMorning = new Date(baseDate);
  nextMorning.setDate(nextMorning.getDate() + 1);
  nextMorning.setHours(10, 0, 0, 0);
  candidateTimes.push(nextMorning);

  for (const candidateStart of candidateTimes) {
    const candStartTime = candidateStart.getTime();
    const candEndTime = candStartTime + durationMs;

    const hasConflict = allEvents.some((ev) => {
      if (!ev.busy || ev.isAllDay) return false;
      const evStart = new Date(ev.startAt).getTime();
      const evEnd = new Date(ev.endAt).getTime();
      return candStartTime < evEnd && candEndTime > evStart;
    });

    if (!hasConflict) {
      const isPreferred = candidateStart.getHours() === preferredHour;
      proposals.push({
        startAt: candidateStart.toISOString(),
        endAt: new Date(candEndTime).toISOString(),
        label: `${candidateStart.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à ${candidateStart.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
        fitsPreferredTime: isPreferred,
      });

      if (proposals.length >= 3) break;
    }
  }

  return proposals;
}

export interface ProposedStudyScheduleItem {
  id: string;
  courseId: string;
  courseTitle: string;
  type: "review" | "exam_prep" | "study";
  startAt: string;
  endAt: string;
  estimatedMinutes: number;
  reason: string;
}

/**
 * Proposes an intelligent study schedule without altering existing plans without user consent.
 */
export function buildStudySchedule(params: {
  courses: Course[];
  activePlans: Plan[];
  exams: Exam[];
  externalEvents: UnifiedCalendarEvent[];
  dailyStudyMinutes: number | null;
  preferredStudyTime: string | null;
  availability?: StudyAvailability;
  now?: Date;
}): ProposedStudyScheduleItem[] {
  const now = params.now ?? new Date();
  const dailyQuota = params.dailyStudyMinutes ?? 45;
  const preferredHour = params.preferredStudyTime ? parseInt(params.preferredStudyTime.split(":")[0] ?? "18", 10) : 18;

  const schedule: ProposedStudyScheduleItem[] = [];
  let allocatedMinutesToday = 0;

  // 1. Due reviews priority
  const duePlans = params.activePlans.filter(
    (p) => p.nextReviewAt && new Date(p.nextReviewAt).getTime() <= now.getTime() + 24 * 3600 * 1000,
  );

  let currentSlotDate = new Date(now);
  currentSlotDate.setHours(preferredHour, 0, 0, 0);
  if (currentSlotDate.getTime() <= now.getTime()) {
    currentSlotDate = new Date(now.getTime() + 30 * 60 * 1000);
  }

  for (const plan of duePlans) {
    const course = params.courses.find((c) => c.id === plan.courseId);
    if (!course || course.archivedAt) continue;

    const duration = course.estimatedReviewMinutes ?? 10;
    if (allocatedMinutesToday + duration > dailyQuota && schedule.length > 0) {
      break;
    }

    const slotStart = new Date(currentSlotDate);
    const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

    schedule.push({
      id: `prop-rev-${plan.id}`,
      courseId: course.id,
      courseTitle: course.title,
      type: "review",
      startAt: slotStart.toISOString(),
      endAt: slotEnd.toISOString(),
      estimatedMinutes: duration,
      reason: "Révision programmée due",
    });

    allocatedMinutesToday += duration;
    currentSlotDate = new Date(slotEnd.getTime() + 10 * 60 * 1000); // 10 min break
  }

  // 2. Urgent Exam Prep if quota permits
  if (allocatedMinutesToday < dailyQuota) {
    const upcomingExams = params.exams
      .filter((e) => new Date(e.examAt).getTime() > now.getTime())
      .sort((a, b) => new Date(a.examAt).getTime() - new Date(b.examAt).getTime());

    for (const exam of upcomingExams) {
      const examDate = new Date(exam.examAt);
      const daysUntil = Math.ceil((examDate.getTime() - now.getTime()) / (24 * 3600 * 1000));

      if (daysUntil <= 14) {
        const relatedCourse = params.courses.find(
          (c) => c.subjectId === exam.subjectId && !c.archivedAt,
        );

        if (relatedCourse && !schedule.some((s) => s.courseId === relatedCourse.id)) {
          const prepDuration = Math.min(25, dailyQuota - allocatedMinutesToday);
          if (prepDuration >= 15) {
            const slotStart = new Date(currentSlotDate);
            const slotEnd = new Date(slotStart.getTime() + prepDuration * 60 * 1000);

            schedule.push({
              id: `prop-exam-${exam.id}`,
              courseId: relatedCourse.id,
              courseTitle: relatedCourse.title,
              type: "exam_prep",
              startAt: slotStart.toISOString(),
              endAt: slotEnd.toISOString(),
              estimatedMinutes: prepDuration,
              reason: `Examen dans ${daysUntil} j : ${exam.title}`,
            });

            allocatedMinutesToday += prepDuration;
            break;
          }
        }
      }
    }
  }

  return schedule;
}

/**
 * Exports user study events and exams to standard RFC 5545 iCalendar string.
 */
export function exportCalendarToIcs(params: {
  plans: Plan[];
  courses: Course[];
  exams: Exam[];
  studySessions: StudySession[];
}): string {
  const events: Array<{
    uid: string;
    summary: string;
    description?: string;
    startAt: string;
    endAt: string;
  }> = [];

  // 1. Export active review plans
  for (const plan of params.plans) {
    if (!plan.nextReviewAt || plan.status !== "active") continue;
    const course = params.courses.find((c) => c.id === plan.courseId);
    if (!course || course.archivedAt) continue;

    const start = new Date(plan.nextReviewAt);
    const durationMin = course.estimatedReviewMinutes ?? 10;
    const end = new Date(start.getTime() + durationMin * 60 * 1000);

    events.push({
      uid: `review-${plan.id}`,
      summary: `[MémoCycle] Révision : ${course.title}`,
      description: `Session de révision espacée MémoCycle. Durée prévue : ${durationMin} min.`,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    });
  }

  // 2. Export exams
  for (const exam of params.exams) {
    const start = new Date(exam.examAt);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hours default
    events.push({
      uid: `exam-${exam.id}`,
      summary: `[Examen] ${exam.title}`,
      description: exam.notes || "Échéance d'examen enregistrée dans MémoCycle.",
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    });
  }

  // 3. Export study sessions
  for (const session of params.studySessions) {
    if (session.status === "cancelled") continue;
    const course = params.courses.find((c) => c.id === session.courseId);
    const title = course ? course.title : "Session d'étude";

    events.push({
      uid: `session-${session.id}`,
      summary: `[Étude] ${title}`,
      description: `Session d'étude MémoCycle (${session.method || "Libre"}).`,
      startAt: session.plannedStartAt,
      endAt: session.plannedEndAt,
    });
  }

  return generateIcsCalendar(events, "MémoCycle Calendrier");
}
