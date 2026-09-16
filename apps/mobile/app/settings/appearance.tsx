import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import {
  Screen,
  Label,
  IconButton,
  SegmentedControl,
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
  const appearance = (settings?.appearance as string) ?? "system";

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton
          icon={ArrowLeft01Icon}
          accessibilityLabel="Retour"
          onPress={() => router.back()}
        />
        <Label large>Apparence</Label>
      </View>

      <SegmentedControl
        options={[
          { label: "Système", value: "system" },
          { label: "Clair", value: "light" },
          { label: "Sombre", value: "dark" },
        ]}
        value={appearance}
        onChange={(mode) =>
          void a.run(() => updateSettings(userId, { appearance: mode }))
        }
      />

      <ErrorText message={a.error} />
    </Screen>
  );
}

