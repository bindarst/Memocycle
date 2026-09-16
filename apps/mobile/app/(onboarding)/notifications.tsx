import React from "react";
import { View, Text } from "react-native";
import { useAuth } from "../../src/auth/AuthProvider";
import { updateSettings } from "../../src/database/settingsService";
import { requestReminderPermission } from "../../src/notifications/notificationService";
import {
  Screen,
  Label,
  Button,
  ErrorText,
  useAction,
  usePalette,
} from "../../src/ui/components";

export default function Notifications() {
  const { userId } = useAuth();
  const a = useAction();
  const c = usePalette();

  const finish = (ask: boolean) =>
    a.run(async () => {
      const enabled = ask ? await requestReminderPermission() : false;
      await updateSettings(userId, {
        remindersEnabled: enabled,
        onboardingCompleted: true,
      });
    });

  return (
    <Screen>
      <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSecondary }}>
        3 / 3
      </Text>
      <Label large>Rappels de révision</Label>
      <Label muted>Un rappel lorsqu’une révision est due.</Label>

      <ErrorText message={a.error} />

      <View style={{ gap: 10, marginTop: 16 }}>
        <Button
          fullWidth
          size="lg"
          title="Activer les rappels"
          disabled={a.busy}
          onPress={() => void finish(true)}
        />
        <Button
          variant="ghost"
          title="Plus tard"
          disabled={a.busy}
          onPress={() => void finish(false)}
          style={{ alignSelf: "center" }}
        />
      </View>
    </Screen>
  );
}
