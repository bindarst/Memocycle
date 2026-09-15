import React, { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { AuthProvider, useAuth } from "../src/auth/AuthProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { find } from "../src/database/repository";
void SplashScreen.preventAutoHideAsync();
function Gate() {
  const { state, onboarded, userId } = useAuth();
  const [pending, setPending] = useState<{
    courseId: string;
    owner: string;
  } | null>(null);
  const authenticated =
    state === "authenticated" || state === "offline_authenticated";
  useEffect(() => {
    if (state !== "booting") void SplashScreen.hideAsync();
  }, [state]);
  useEffect(() => {
    const receive = (r: Notifications.NotificationResponse) => {
      const d = r.notification.request.content.data ?? {};
      if (
        d.type === "review_due" &&
        typeof d.courseId === "string" &&
        typeof d.ownerUserId === "string"
      )
        setPending({ courseId: d.courseId, owner: d.ownerUserId });
    };
    const sub = Notifications.addNotificationResponseReceivedListener(receive);
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) receive(r);
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (authenticated && onboarded && pending) {
      setPending(null);
      if (pending.owner === userId)
        void find("course", pending.courseId, userId).then((course) => {
          if (course) router.push(`/review/${course.id}`);
        });
    }
  }, [authenticated, onboarded, pending, userId]);
  if (state === "booting") return null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!authenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={authenticated && !onboarded}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={authenticated && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="course" />
        <Stack.Screen name="subject" />
        <Stack.Screen name="module" />
        <Stack.Screen name="review" />
        <Stack.Screen name="stats" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="paywall" />
      </Stack.Protected>
    </Stack>
  );
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
