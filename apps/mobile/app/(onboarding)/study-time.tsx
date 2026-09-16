import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/auth/AuthProvider";
import { updateSettings } from "../../src/database/settingsService";
import {
  Screen,
  Label,
  Button,
  ErrorText,
  useAction,
  usePalette,
} from "../../src/ui/components";

const OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
  { value: null, label: "Pas de limite" },
];

export default function StudyTime() {
  const { userId } = useAuth();
  const a = useAction();
  const c = usePalette();
  const [selected, setSelected] = useState<number | null>(30);

  return (
    <Screen>
      <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSecondary }}>
        2 / 3
      </Text>
      <Label large>Temps quotidien souhaité</Label>
      <Label muted>Cette estimation aide à calibrer tes sessions de révision.</Label>

      <View style={{ gap: 8, marginTop: 4 }}>
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <Pressable
              key={String(opt.value)}
              onPress={() => setSelected(opt.value)}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => ({
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: isSelected ? c.primarySoft : c.surface,
                borderWidth: 1,
                borderColor: isSelected ? c.primary : c.border,
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
            </Pressable>
          );
        })}
      </View>

      <ErrorText message={a.error} />

      <View style={{ marginTop: 12 }}>
        <Button
          fullWidth
          size="lg"
          title="Continuer"
          disabled={a.busy}
          onPress={() =>
            void a.run(async () => {
              await updateSettings(userId, { dailyStudyMinutes: selected });
              router.push("/(onboarding)/notifications");
            })
          }
        />
      </View>
    </Screen>
  );
}
