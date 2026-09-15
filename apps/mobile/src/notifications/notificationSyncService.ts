import * as Notifications from "expo-notifications";
import { all } from "../database/repository";
import { courseSchema, planSchema, settingsSchema } from "../database/entities";
import { scheduleReview } from "./notificationService";
import { currentSession } from '../auth/authService';
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
  if(currentSession()?.currentUserId!==userId)return;
  const [rawCourses, rawPlans, rawSettings, scheduled, permission] =
    await Promise.all([
      all("course", userId),
      all("reviewPlan", userId),
      all("userSettings", userId),
      Notifications.getAllScheduledNotificationsAsync(),
      Notifications.getPermissionsAsync(),
    ]);
  const settings = rawSettings[0] ? settingsSchema.parse(rawSettings[0]) : null;
  const courses = rawCourses.map((c) => courseSchema.parse(c));
  const desired =
    permission.granted && settings?.remindersEnabled
      ? rawPlans
          .map((p) => planSchema.parse(p))
          .filter(
            (p) =>
              p.status === "active" &&
              p.nextReviewAt &&
              new Date(p.nextReviewAt).getTime() > Date.now() &&
              courses.some((c) => c.id === p.courseId && !c.archivedAt),
          )
          .sort((a, b) => a.nextReviewAt!.localeCompare(b.nextReviewAt!))
          .slice(0, 60)
      : [];
  for (const existing of scheduled) {
    if(currentSession()?.currentUserId!==userId)return;
    const p = desired.find(
      (p) =>
        p.courseId === existing.content.data?.courseId &&
        existing.content.data?.ownerUserId === userId &&
        existing.content.data?.at === p.nextReviewAt,
    );
    if (!p)
      await Notifications.cancelScheduledNotificationAsync(existing.identifier);
  }
  for (const p of desired) {
    if(currentSession()?.currentUserId!==userId)return;
    if (
      !scheduled.some(
        (n) =>
          n.content.data?.ownerUserId === userId &&
          n.content.data?.courseId === p.courseId &&
          n.content.data?.at === p.nextReviewAt,
      )
    ) {
      const course = courses.find((c) => c.id === p.courseId)!;
      await scheduleReview({
        userId,
        courseId: course.id,
        reviewPlanId: p.id,
        title: course.title,
        step: p.currentStep,
        at: p.nextReviewAt!,
        sound: settings?.soundEnabled ?? true,
      });
    }
  }
}
