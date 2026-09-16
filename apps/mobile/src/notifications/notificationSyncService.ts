import * as Notifications from "expo-notifications";
import { all } from "../database/repository";
import {
  courseSchema,
  planSchema,
  settingsSchema,
  examSchema,
  type Plan,
} from "../database/entities";
import { scheduleReview, scheduleExamReminder } from "./notificationService";
import { currentSession } from "../auth/authService";

let running: Promise<void> | null = null;
let rerunRequested = false;

export const waitForNotifications = () => running ?? Promise.resolve();

export function syncScheduledNotifications(userId: string) {
  if (running) {
    rerunRequested = true;
    return running;
  }
  running = (async () => {
    do {
      rerunRequested = false;
      await reconcile(userId);
    } while (rerunRequested);
  })().finally(() => {
    running = null;
  });
  return running;
}

async function reconcile(userId: string) {
  if (currentSession()?.currentUserId !== userId) return;

  const [rawCourses, rawPlans, rawSettings, rawExams, scheduled, permission] =
    await Promise.all([
      all("course", userId),
      all("reviewPlan", userId),
      all("userSettings", userId),
      all("exam", userId),
      Notifications.getAllScheduledNotificationsAsync(),
      Notifications.getPermissionsAsync(),
    ]);

  const settings = rawSettings[0] ? settingsSchema.parse(rawSettings[0]) : null;
  const courses = rawCourses.map((c) => courseSchema.parse(c));
  const exams = rawExams.map((e) => examSchema.parse(e));

  const desiredReviews =
    permission.granted && settings?.remindersEnabled
      ? rawPlans
          .map((p) => planSchema.parse(p))
          .filter(
            (p): p is Plan & { nextReviewAt: string } =>
              p.status === "active" &&
              typeof p.nextReviewAt === "string" &&
              new Date(p.nextReviewAt).getTime() > Date.now() &&
              courses.some((c) => c.id === p.courseId && !c.archivedAt),
          )
          .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))
          .slice(0, 50)
      : [];

  const desiredExams =
    permission.granted && settings?.remindersEnabled && (settings?.examRemindersEnabled ?? true)
      ? exams
          .filter((e) => new Date(e.examAt).getTime() > Date.now())
          .slice(0, 10)
      : [];

  // Annuler les notifications devenues obsolètes
  for (const existing of scheduled) {
    if (currentSession()?.currentUserId !== userId) return;
    const type = existing.content.data?.type;

    if (type === "review_due") {
      const match = desiredReviews.find(
        (p) =>
          p.courseId === existing.content.data?.courseId &&
          existing.content.data?.ownerUserId === userId &&
          existing.content.data?.at === p.nextReviewAt,
      );
      if (!match) {
        await Notifications.cancelScheduledNotificationAsync(existing.identifier);
      }
    } else if (type === "exam_upcoming") {
      const match = desiredExams.find(
        (e) =>
          e.id === existing.content.data?.examId &&
          existing.content.data?.ownerUserId === userId,
      );
      if (!match) {
        await Notifications.cancelScheduledNotificationAsync(existing.identifier);
      }
    }
  }

  // Programmer les révisions désirées manquantes
  for (const p of desiredReviews) {
    if (currentSession()?.currentUserId !== userId) return;
    const alreadyScheduled = scheduled.some(
      (n) =>
        n.content.data?.ownerUserId === userId &&
        n.content.data?.courseId === p.courseId &&
        n.content.data?.at === p.nextReviewAt,
    );

    if (!alreadyScheduled) {
      const course = courses.find((c) => c.id === p.courseId);
      if (course) {
        await scheduleReview({
          userId,
          courseId: course.id,
          reviewPlanId: p.id,
          title: course.title,
          step: p.currentStep,
          at: p.nextReviewAt,
          sound: settings?.soundEnabled ?? true,
        });
      }
    }
  }

  // Programmer les rappels d'examens
  for (const exam of desiredExams) {
    if (currentSession()?.currentUserId !== userId) return;
    const alreadyScheduled = scheduled.some(
      (n) =>
        n.content.data?.ownerUserId === userId &&
        n.content.data?.examId === exam.id,
    );

    if (!alreadyScheduled) {
      const examTime = new Date(exam.examAt).getTime();
      const daysRemaining = Math.max(1, Math.round((examTime - Date.now()) / (24 * 3600000)));
      // Rappel programmé 24h avant l'examen
      const reminderTime = new Date(Math.max(Date.now() + 60000, examTime - 24 * 3600000));

      await scheduleExamReminder({
        userId,
        examId: exam.id,
        title: exam.title,
        daysRemaining,
        at: reminderTime.toISOString(),
        sound: settings?.soundEnabled ?? true,
      });
    }
  }
}
