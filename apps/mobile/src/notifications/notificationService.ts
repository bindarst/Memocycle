import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const channelId = "review-reminders";

export const NOTIFICATION_CATEGORIES = {
  REVIEW_DUE: "review_due",
  REVIEW_OVERDUE: "review_overdue",
  EXAM_UPCOMING: "exam_upcoming",
  DAILY_PLAN: "daily_plan",
} as const;

export const NOTIFICATION_ACTIONS = {
  REVIEW_NOW: "REVIEW_NOW",
  SNOOZE_15: "SNOOZE_15",
  SNOOZE_60: "SNOOZE_60",
  SNOOZE_TOMORROW: "SNOOZE_TOMORROW",
} as const;

export async function initializeNotifications() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: "Rappels de révision",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 200],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  }

  // Configuration des catégories avec boutons d'action rapides
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.REVIEW_DUE, [
    { identifier: NOTIFICATION_ACTIONS.REVIEW_NOW, buttonTitle: "Réviser maintenant", options: { opensAppToForeground: true } },
    { identifier: NOTIFICATION_ACTIONS.SNOOZE_15, buttonTitle: "+15 min", options: { opensAppToForeground: false } },
    { identifier: NOTIFICATION_ACTIONS.SNOOZE_60, buttonTitle: "+1 heure", options: { opensAppToForeground: false } },
    { identifier: NOTIFICATION_ACTIONS.SNOOZE_TOMORROW, buttonTitle: "Demain", options: { opensAppToForeground: false } },
  ]);

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.REVIEW_OVERDUE, [
    { identifier: NOTIFICATION_ACTIONS.REVIEW_NOW, buttonTitle: "Rattraper maintenant", options: { opensAppToForeground: true } },
    { identifier: NOTIFICATION_ACTIONS.SNOOZE_60, buttonTitle: "+1 heure", options: { opensAppToForeground: false } },
    { identifier: NOTIFICATION_ACTIONS.SNOOZE_TOMORROW, buttonTitle: "Demain", options: { opensAppToForeground: false } },
  ]);

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.EXAM_UPCOMING, [
    { identifier: NOTIFICATION_ACTIONS.REVIEW_NOW, buttonTitle: "Préparer l'examen", options: { opensAppToForeground: true } },
    { identifier: NOTIFICATION_ACTIONS.SNOOZE_TOMORROW, buttonTitle: "Rappeler demain", options: { opensAppToForeground: false } },
  ]);

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.DAILY_PLAN, [
    { identifier: NOTIFICATION_ACTIONS.REVIEW_NOW, buttonTitle: "Démarrer la session", options: { opensAppToForeground: true } },
    { identifier: NOTIFICATION_ACTIONS.SNOOZE_60, buttonTitle: "+1 heure", options: { opensAppToForeground: false } },
  ]);

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestReminderPermission() {
  await initializeNotifications();
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function scheduleReview(input: {
  userId: string;
  courseId: string;
  reviewPlanId: string;
  title: string;
  step: number;
  at: string;
  sound: boolean;
}) {
  return Notifications.scheduleNotificationAsync({
    identifier: `review:${input.userId}:${input.courseId}`,
    content: {
      title: "C’est le moment de réviser",
      body: `${input.title} • Rappel programmé`,
      sound: input.sound ? "default" : false,
      categoryIdentifier: NOTIFICATION_CATEGORIES.REVIEW_DUE,
      data: {
        type: "review_due",
        ownerUserId: input.userId,
        courseId: input.courseId,
        reviewPlanId: input.reviewPlanId,
        at: input.at,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(input.at),
      channelId,
    },
  });
}

export async function scheduleOverdueReminder(input: {
  userId: string;
  courseId: string;
  reviewPlanId: string;
  title: string;
  delayHours: number;
  sound: boolean;
}) {
  return Notifications.scheduleNotificationAsync({
    identifier: `overdue:${input.userId}:${input.courseId}`,
    content: {
      title: "Révision en retard",
      body: `${input.title} attend ta validation (retard de ${Math.round(input.delayHours)}h)`,
      sound: input.sound ? "default" : false,
      categoryIdentifier: NOTIFICATION_CATEGORIES.REVIEW_OVERDUE,
      data: {
        type: "review_overdue",
        ownerUserId: input.userId,
        courseId: input.courseId,
        reviewPlanId: input.reviewPlanId,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3600 * 2,
      repeats: false,
      channelId,
    },
  });
}

export async function scheduleExamReminder(input: {
  userId: string;
  examId: string;
  title: string;
  daysRemaining: number;
  at: string;
  sound: boolean;
}) {
  return Notifications.scheduleNotificationAsync({
    identifier: `exam:${input.userId}:${input.examId}`,
    content: {
      title: "Examen imminent",
      body: `${input.title} dans ${input.daysRemaining} jour${input.daysRemaining > 1 ? "s" : ""}. Consolide ta mémoire aujourd'hui !`,
      sound: input.sound ? "default" : false,
      categoryIdentifier: NOTIFICATION_CATEGORIES.EXAM_UPCOMING,
      data: {
        type: "exam_upcoming",
        ownerUserId: input.userId,
        examId: input.examId,
        at: input.at,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(input.at),
      channelId,
    },
  });
}

export async function scheduleDailyPlanReminder(input: {
  userId: string;
  reviewCount: number;
  estimatedMinutes: number;
  at: string;
  sound: boolean;
}) {
  return Notifications.scheduleNotificationAsync({
    identifier: `daily_plan:${input.userId}`,
    content: {
      title: "Ton plan d’étude du jour",
      body: `${input.reviewCount} cours prêts pour aujourd'hui (environ ${input.estimatedMinutes} min)`,
      sound: input.sound ? "default" : false,
      categoryIdentifier: NOTIFICATION_CATEGORIES.DAILY_PLAN,
      data: {
        type: "daily_plan",
        ownerUserId: input.userId,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(input.at),
      channelId,
    },
  });
}

export async function snoozeReminder(
  identifier: string,
  snoozeMinutes: number,
  sound = true,
) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existing = scheduled.find((n) => n.identifier === identifier);
  if (!existing) return;

  await Notifications.cancelScheduledNotificationAsync(identifier);

  const newDate = new Date(Date.now() + Math.max(1, snoozeMinutes) * 60_000);

  return Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: existing.content.title ?? undefined,
      subtitle: existing.content.subtitle ?? undefined,
      body: existing.content.body ?? undefined,
      data: existing.content.data,
      categoryIdentifier: existing.content.categoryIdentifier ?? undefined,
      sound: sound ? "default" : false,
      badge: existing.content.badge ?? undefined,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: newDate,
      channelId,
    },
  });
}

export async function cancelAll() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
}
