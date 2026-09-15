import { router } from "expo-router";
import { Linking, Platform } from "react-native";
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
import { requestReminderPermission } from "../../src/notifications/notificationService";
export default function Notifications() {
  const { userId } = useAuth();
  const a = useAction();
  const s = useEntities("userSettings")[0];
  return (
    <Screen>
      <Button secondary title="Retour" onPress={() => router.back()} />
      <Label large>Notifications</Label>
      <Button
        secondary
        title={`Rappels de révision : ${s?.remindersEnabled ? "activés" : "désactivés"}`}
        onPress={() =>
          void a.run(async () => {
            const enabled = s?.remindersEnabled
              ? false
              : await requestReminderPermission();
            await updateSettings(userId, { remindersEnabled: enabled });
          })
        }
      />
      {Platform.OS !== "android" && (
        <Button
          secondary
          title={`Son : ${s?.soundEnabled ? "activé" : "désactivé"}`}
          onPress={() =>
            void a.run(() =>
              updateSettings(userId, { soundEnabled: !s?.soundEnabled }),
            )
          }
        />
      )}
      <Button
        secondary
        title={
          Platform.OS === "android"
            ? "Son et vibration : paramètres système"
            : "Vibration : paramètres système"
        }
        onPress={() => void Linking.openSettings()}
      />
      <Button
        secondary
        disabled
        title="Résumé du matin : désactivé"
        onPress={() => {}}
      />
      <Label muted>
        Le résumé quotidien restera indisponible tant qu’il ne peut pas afficher
        un planning fiable sans ouvrir l’application.
      </Label>
      <Label muted>
        Sur Android, le son et les vibrations se règlent dans les paramètres
        système du canal « Rappels de révision ».
      </Label>
      <Button
        secondary
        title="Ouvrir les paramètres système"
        onPress={() => void Linking.openSettings()}
      />
      <ErrorText message={a.error} />
    </Screen>
  );
}
