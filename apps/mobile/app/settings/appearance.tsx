import { router } from "expo-router";
import {
  Screen,
  Label,
  Button,
  ErrorText,
  useAction,
  useEntities,
} from "../../src/ui/components";
import { useAuth } from "../../src/auth/AuthProvider";
import { updateSettings } from "../../src/database/settingsService";
export default function Appearance() {
  const { userId } = useAuth();
  const a = useAction();
  const settings = useEntities("userSettings")[0];
  return (
    <Screen>
      <Button secondary title="Retour" onPress={() => router.back()} />
      <Label large>Apparence</Label>
      {[
        ["system", "Système"],
        ["light", "Clair"],
        ["dark", "Sombre"],
      ].map(([mode, label]) => (
        <Button
          key={mode}
          secondary={settings?.appearance !== mode}
          title={label!}
          onPress={() =>
            void a.run(() => updateSettings(userId, { appearance: mode }))
          }
        />
      ))}
      <ErrorText message={a.error} />
    </Screen>
  );
}
