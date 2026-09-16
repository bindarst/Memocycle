import React from "react";
import { router } from "expo-router";
import { View, Text, Pressable } from "react-native";
import { ArrowLeft01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { useAuth } from "../../src/auth/AuthProvider";
import { updateSettings } from "../../src/database/settingsService";
import {
  Screen,
  Label,
  IconButton,
  Card,
  ErrorText,
  useAction,
  useEntities,
  usePalette,
  SectionTitle,
} from "../../src/ui/components";
import { AppIcon } from "../../src/ui/Icon";
import { settingsSchema } from "../../src/database/entities";

export default function StudySettings() {
  const { userId } = useAuth();
  const c = usePalette();
  const action = useAction();
  const rawSettings = useEntities("userSettings")[0];
  const settings = rawSettings ? settingsSchema.parse(rawSettings) : null;

  const timeOptions = [
    { label: "15 min", value: 15 },
    { label: "30 min", value: 30 },
    { label: "45 min", value: 45 },
    { label: "60 min", value: 60 },
    { label: "Pas de limite", value: null },
  ];

  const retentionOptions = [
    { label: "80 % · Espacé", value: 0.8 },
    { label: "85 % · Modéré", value: 0.85 },
    { label: "90 % · Recommandé", value: 0.9 },
    { label: "95 % · Intensif", value: 0.95 },
  ];

  const currentRetention = settings?.desiredRetention ?? 0.9;
  const currentMinutes = settings?.dailyStudyMinutes ?? null;

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton
          icon={ArrowLeft01Icon}
          accessibilityLabel="Retour"
          onPress={() => router.back()}
        />
        <Label large>Temps & Rétention</Label>
      </View>

      <SectionTitle title="Temps quotidien" />
      <Card style={{ padding: 10, gap: 6 }}>
        {timeOptions.map((opt) => {
          const isSelected = currentMinutes === opt.value;
          return (
            <Pressable
              key={String(opt.value)}
              onPress={() =>
                void action.run(() =>
                  updateSettings(userId, { dailyStudyMinutes: opt.value }),
                )
              }
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              style={({ pressed }) => ({
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: isSelected ? c.primarySoft : "transparent",
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: isSelected ? "700" : "500",
                  color: isSelected ? c.primary : c.textPrimary,
                }}
              >
                {opt.label}
              </Text>
              {isSelected && <AppIcon icon={Tick01Icon} size={18} color={c.primary} />}
            </Pressable>
          );
        })}
      </Card>

      <SectionTitle title="Objectif de rétention" />
      <Card style={{ padding: 10, gap: 6 }}>
        {retentionOptions.map((opt) => {
          const isSelected = Math.abs(currentRetention - opt.value) < 0.01;
          return (
            <Pressable
              key={String(opt.value)}
              onPress={() =>
                void action.run(() =>
                  updateSettings(userId, { desiredRetention: opt.value }),
                )
              }
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              style={({ pressed }) => ({
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: isSelected ? c.primarySoft : "transparent",
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: isSelected ? "700" : "500",
                  color: isSelected ? c.primary : c.textPrimary,
                }}
              >
                {opt.label}
              </Text>
              {isSelected && <AppIcon icon={Tick01Icon} size={18} color={c.primary} />}
            </Pressable>
          );
        })}
      </Card>

      <ErrorText message={action.error} />
    </Screen>
  );
}

