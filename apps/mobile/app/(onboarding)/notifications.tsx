import { useAuth } from "../../src/auth/AuthProvider";
import { updateSettings } from "../../src/database/settingsService";
import { requestReminderPermission } from "../../src/notifications/notificationService";
import {
  Screen,
  Label,
  Button,
  ErrorText,
  useAction,
} from "../../src/ui/components";
export default function Notifications() {
  const { userId } = useAuth();
  const a = useAction();
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
      <Label muted>3 / 3</Label>
      <Label large>
        Laisse MémoCycle te rappeler quand une révision arrive.
      </Label>
      <Label>Tu recevras uniquement les rappels liés à tes révisions.</Label>
      <Button
        title="Activer les rappels"
        disabled={a.busy}
        onPress={() => void finish(true)}
      />
      <Button
        secondary
        title="Plus tard"
        disabled={a.busy}
        onPress={() => void finish(false)}
      />
      <ErrorText message={a.error} />
    </Screen>
  );
}
