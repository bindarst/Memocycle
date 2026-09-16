import { router } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Sparkles, Target } from "lucide-react-native";
import { useAuth } from "../../src/auth/AuthProvider";
import { updateSettings } from "../../src/database/settingsService";
import {
  Screen,
  Label,
  Button,
  Card,
  ErrorText,
  useAction,
  useEntities,
  usePalette,
  SectionTitle,
} from "../../src/ui/components";
import { settingsSchema } from "../../src/database/entities";

export default function StudySettings() {
  const { userId } = useAuth();
  const c = usePalette();
  const action = useAction();
  const rawSettings = useEntities("userSettings")[0];
  const settings = rawSettings ? settingsSchema.parse(rawSettings) : null;

  const timeOptions = [15, 30, 45, 60, 90, 120, null];
  const retentionOptions = [
    { label: "80 % · Révisions très espacées", value: 0.8 },
    { label: "85 % · Rythme allégé", value: 0.85 },
    { label: "90 % · Recommandé (Équilibre idéal)", value: 0.9 },
    { label: "95 % · Haute précision", value: 0.95 },
    { label: "97 % · Mémorisation maximale (Intensif)", value: 0.97 },
  ];

  const currentRetention = settings?.desiredRetention ?? 0.9;

  return (
    <Screen>
      <Button secondary title="Retour" onPress={() => router.back()} />

      <SectionTitle eyebrow="Préférences" title="Temps d’étude quotidien" />
      <Card>
        <Label muted>
          Cette préférence guide l’assistant intelligent pour calibrer tes sessions quotidiennes.
          Les révisions échues restent toujours prioritaires et accessibles.
        </Label>

        <View style={styles.grid}>
          {timeOptions.map((minutes) => (
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
        </View>
      </Card>

      <SectionTitle eyebrow="Moteur FSRS" title="Objectif de rétention cible" />
      <Card style={{ gap: 12 }}>
        <View style={styles.headerRow}>
          <Target color={c.primary} size={22} />
          <Text style={[styles.cardTitle, { color: c.textPrimary }]}>
            Rétention mémorielle souhaitée
          </Text>
        </View>

        <Label muted>
          Définit le seuil de rappel visé lors des révisions. Une rétention plus élevée rapproche les
          échéances pour garantir un taux de rappel quasi parfait.
        </Label>

        {retentionOptions.map(({ label, value }) => {
          const isSelected = Math.abs(currentRetention - value) < 0.01;
          return (
            <Button
              key={value}
              secondary={!isSelected}
              title={label}
              disabled={action.busy}
              onPress={() =>
                void action.run(() =>
                  updateSettings(userId, { desiredRetention: value }),
                )
              }
            />
          );
        })}

        <View style={[styles.infoBox, { backgroundColor: c.surfaceMuted }]}>
          <Sparkles color={c.primary} size={18} />
          <Text style={[styles.infoText, { color: c.textSecondary }]}>
            L’algorithme FSRS calcule les intervalles sur mesure pour chaque cours en fonction de
            cette cible.
          </Text>
        </View>
      </Card>

      <ErrorText message={action.error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: "800" },
  infoBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "600" },
});
