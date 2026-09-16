import React from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { Screen, Label, Card, Button, usePalette } from "../../src/ui/components";

export default function Onboarding() {
  const c = usePalette();
  return (
    <Screen>
      <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSecondary }}>
        1 / 3
      </Text>
      <Label large>Révise avec le bon espacement</Label>
      <Label muted>
        MémoCycle calcule le moment optimal pour revoir chaque cours avant l’oubli.
      </Label>

      <Card style={{ padding: 14 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: c.textPrimary }}>
          Aujourd’hui → J+1 → J+3 → J+7
        </Text>
      </Card>

      <View style={{ marginTop: 12 }}>
        <Button
          fullWidth
          size="lg"
          title="Continuer"
          onPress={() => router.push("/(onboarding)/study-time")}
        />
      </View>
    </Screen>
  );
}
