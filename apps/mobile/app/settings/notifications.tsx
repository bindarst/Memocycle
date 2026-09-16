import React, { useState } from "react";
import { router } from "expo-router";
import { Linking, Platform, View, Switch, Text } from "react-native";
import {
  ArrowLeft01Icon,
  Notification01Icon,
  Clock01Icon,
  ExternalLinkIcon,
  VolumeHighIcon,
} from "@hugeicons/core-free-icons";
import {
  Screen,
  Label,
  Button,
  IconButton,
  Field,
  Card,
  ListRow,
  ErrorText,
  useAction,
  useEntities,
  SectionTitle,
  usePalette,
} from "../../src/ui/components";
import { useAuth } from "../../src/auth/AuthProvider";
import { updateSettings } from "../../src/database/settingsService";
import { requestReminderPermission } from "../../src/notifications/notificationService";
import { settingsSchema, type Settings } from "../../src/database/entities";

export default function Notifications() {
  const { userId } = useAuth();
  const a = useAction();
  const c = usePalette();
  const raw = useEntities("userSettings")[0];
  const s: Settings | null = raw ? settingsSchema.parse(raw) : null;

  const [quietStart, setQuietStart] = useState<string>(s?.quietHoursStart ?? "22:00");
  const [quietEnd, setQuietEnd] = useState<string>(s?.quietHoursEnd ?? "07:00");
  const [editingQuiet, setEditingQuiet] = useState(false);

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton
          icon={ArrowLeft01Icon}
          accessibilityLabel="Retour"
          onPress={() => router.back()}
        />
        <Label large>Notifications</Label>
      </View>

      <SectionTitle title="Rappels" />
      <View style={{ gap: 6 }}>
        <ListRow
          icon={Notification01Icon}
          title="Rappels de révision"
          rightComponent={
            <Switch
              value={!!s?.remindersEnabled}
              onValueChange={(val) =>
                void a.run(async () => {
                  const enabled = val ? await requestReminderPermission() : false;
                  await updateSettings(userId, { remindersEnabled: enabled });
                })
              }
              trackColor={{ false: c.border, true: c.primary }}
            />
          }
        />

        <ListRow
          icon={Clock01Icon}
          title="Révisions en retard"
          rightComponent={
            <Switch
              value={s?.overdueRemindersEnabled !== false}
              onValueChange={(val) =>
                void a.run(() =>
                  updateSettings(userId, { overdueRemindersEnabled: val }),
                )
              }
              trackColor={{ false: c.border, true: c.primary }}
            />
          }
        />

        <ListRow
          icon={Notification01Icon}
          title="Rappels d’examens"
          rightComponent={
            <Switch
              value={s?.examRemindersEnabled !== false}
              onValueChange={(val) =>
                void a.run(() =>
                  updateSettings(userId, { examRemindersEnabled: val }),
                )
              }
              trackColor={{ false: c.border, true: c.primary }}
            />
          }
        />
      </View>

      <SectionTitle title="Heures calmes" />
      <Card style={{ padding: 14, gap: 10 }}>
        {s?.quietHoursStart && s?.quietHoursEnd ? (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: c.textPrimary }}>
                De {String(s.quietHoursStart)} à {String(s.quietHoursEnd)}
              </Text>
              <Text style={{ fontSize: 12, color: c.textSecondary }}>
                Aucun rappel sonore
              </Text>
            </View>
            <Button
              size="sm"
              variant="ghost"
              title="Désactiver"
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
        ) : editingQuiet ? (
          <View style={{ gap: 10 }}>
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
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button
                size="sm"
                title="Enregistrer"
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
              <Button
                size="sm"
                variant="ghost"
                title="Annuler"
                onPress={() => setEditingQuiet(false)}
              />
            </View>
          </View>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            title="Activer les heures calmes"
            onPress={() => setEditingQuiet(true)}
          />
        )}
      </Card>

      <SectionTitle title="Système" />
      <View style={{ gap: 6 }}>
        {Platform.OS !== "android" && (
          <ListRow
            icon={VolumeHighIcon}
            title="Sons"
            rightComponent={
              <Switch
                value={!!s?.soundEnabled}
                onValueChange={(val) =>
                  void a.run(() => updateSettings(userId, { soundEnabled: val }))
                }
                trackColor={{ false: c.border, true: c.primary }}
              />
            }
          />
        )}

        <ListRow
          icon={ExternalLinkIcon}
          title="Paramètres du système"
          showChevron
          onPress={() => void Linking.openSettings()}
        />
      </View>

      <ErrorText message={a.error} />
    </Screen>
  );
}

