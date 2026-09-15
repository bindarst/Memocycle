import { router } from "expo-router";
import { useAuth } from "../../src/auth/AuthProvider";
import { updateSettings } from "../../src/database/settingsService";
import {
  Screen,
  Label,
  Button,
  ErrorText,
  useAction,
} from "../../src/ui/components";
export default function StudyTime() {
  const { userId } = useAuth();
  const a = useAction();
  return (
    <Screen>
      <Label muted>2 / 3</Label>
      <Label large>
        Combien de temps veux-tu consacrer aux révisions chaque jour ?
      </Label>
      {[15, 30, 45, 60, null].map((n) => (
        <Button
          key={n ?? "none"}
          secondary
          title={n ? `${n} min` : "Pas de limite"}
          disabled={a.busy}
          onPress={() =>
            void a.run(async () => {
              await updateSettings(userId, { dailyStudyMinutes: n });
              router.push("/(onboarding)/notifications");
            })
          }
        />
      ))}
      <ErrorText message={a.error} />
    </Screen>
  );
}
