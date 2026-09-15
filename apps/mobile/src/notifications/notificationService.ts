import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
export const channelId = "review-reminders";
export async function initializeNotifications() {
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync(channelId, {
      name: "Rappels de révision",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 200],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
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
      title: "C'est le moment de réviser",
      body: `${input.title} • Révision ${input.step}/6`,
      sound: input.sound ? "default" : false,
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
export async function cancelAll() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
}
