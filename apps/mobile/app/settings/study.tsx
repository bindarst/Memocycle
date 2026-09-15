import { router } from "expo-router";
import { useAuth } from "../../src/auth/AuthProvider";
import { updateSettings } from "../../src/database/settingsService";
import {
  Screen,
  Label,
  Button,
  ErrorText,
  useAction,
  useEntities,
} from "../../src/ui/components";

export default function StudySettings() {
  const { userId } = useAuth();
  const action = useAction();
  const settings = useEntities("userSettings")[0];
  return (
    <Screen>
      <Button secondary title="Retour" onPress={() => router.back()} />
      <Label large>Temps de révision quotidien</Label>
      <Label muted>
        Cette préférence aide à estimer ta charge. Elle ne bloque jamais une
        révision due.
      </Label>
      {[15, 30, 45, 60, null].map((minutes) => (
        <Button
          key={minutes ?? "none"}
          secondary={settings?.dailyStudyMinutes !== minutes}
          title={minutes ? `${minutes} min` : "Pas de limite"}
          disabled={action.busy}
          onPress={() =>
            void action.run(() =>
              updateSettings(userId, { dailyStudyMinutes: minutes }),
            )
          }
        />
      ))}
      <ErrorText message={action.error} />
    </Screen>
  );
}
