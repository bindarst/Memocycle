import React, { useState } from "react";
import { router } from "expo-router";
import { Linking, Platform, View } from "react-native";
import {
  Screen,
  Label,
  Button,
  Field,
  Card,
  ErrorText,
  useAction,
  useEntities,
  SectionTitle,
} from "../../src/ui/components";
import { useAuth } from "../../src/auth/AuthProvider";
import { updateSettings } from "../../src/database/settingsService";
import { requestReminderPermission } from "../../src/notifications/notificationService";
import { settingsSchema, type Settings } from "../../src/database/entities";

export default function Notifications() {
  const { userId } = useAuth();
  const a = useAction();
  const raw = useEntities("userSettings")[0];
  const s: Settings | null = raw ? settingsSchema.parse(raw) : null;

  const [quietStart, setQuietStart] = useState<string>(s?.quietHoursStart ?? "22:00");
  const [quietEnd, setQuietEnd] = useState<string>(s?.quietHoursEnd ?? "07:00");
  const [editingQuiet, setEditingQuiet] = useState(false);

  return (
    <Screen>
      <Button secondary title="Retour" onPress={() => router.back()} />
      <Label large>Notifications et rappels</Label>

      <SectionTitle
        eyebrow="Rappels d'apprentissage"
        title="Alertes de révision"
      />

      <Card>
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

        <Button
          secondary
          title={`Alertes révisions en retard : ${s?.overdueRemindersEnabled !== false ? "activées" : "désactivées"}`}
          onPress={() =>
            void a.run(() =>
              updateSettings(userId, {
                overdueRemindersEnabled: s?.overdueRemindersEnabled === false,
              }),
            )
          }
        />

        <Button
          secondary
          title={`Rappels d'examens : ${s?.examRemindersEnabled !== false ? "activés" : "désactivés"}`}
          onPress={() =>
            void a.run(() =>
              updateSettings(userId, {
                examRemindersEnabled: s?.examRemindersEnabled === false,
              }),
            )
          }
        />
      </Card>

      <SectionTitle eyebrow="Confort d'étude" title="Heures calmes" />

      <Card>
        <Label muted>
          Pendant les heures calmes, aucun rappel sonore ne viendra perturber ton
          sommeil.
        </Label>
        {s?.quietHoursStart && s?.quietHoursEnd ? (
          <View style={{ gap: 8 }}>
            <Label>
              Heures calmes actives : de {String(s.quietHoursStart)} à {String(s.quietHoursEnd)}
            </Label>
            <Button
              secondary
              title="Désactiver les heures calmes"
              onPress={() =>
                void a.run(() =>
                  updateSettings(userId, {
                    quietHoursStart: null,
                    quietHoursEnd: null,
                  }),
                )
              }
            />
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {editingQuiet ? (
              <View style={{ gap: 12 }}>
                <Field
                  label="Début (HH:MM)"
                  value={quietStart}
                  onChangeText={setQuietStart}
                  placeholder="22:00"
                />
                <Field
                  label="Fin (HH:MM)"
                  value={quietEnd}
                  onChangeText={setQuietEnd}
                  placeholder="07:00"
                />
                <Button
                  title="Enregistrer les heures calmes"
                  onPress={() =>
                    void a.run(async () => {
                      await updateSettings(userId, {
                        quietHoursStart: quietStart,
                        quietHoursEnd: quietEnd,
                      });
                      setEditingQuiet(false);
                    })
                  }
                />
              </View>
            ) : (
              <Button
                secondary
                title="Configurer des heures calmes (ex: 22h-07h)"
                onPress={() => setEditingQuiet(true)}
              />
            )}
          </View>
        )}
      </Card>

      <SectionTitle eyebrow="Système" title="Sons et vibrations" />

      <Card>
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
        <Label muted>
          Sur Android et iOS, les autorisations détaillées et vibrations se
          règlent dans les paramètres de ton téléphone.
        </Label>
        <Button
          secondary
          title="Ouvrir les paramètres système"
          onPress={() => void Linking.openSettings()}
        />
      </Card>

      <ErrorText message={a.error} />
    </Screen>
  );
}
