import { useEffect, useState } from "react";
import { router } from "expo-router";
import { startOfWeek, startOfMonth, subDays } from "date-fns";
import { StyleSheet, Text, View } from "react-native";
import { ArrowLeft, CalendarCheck2, Clock3, Flame, Layers3 } from "lucide-react-native";
import {
  Screen,
  Label,
  Card,
  Button,
  useEntities,
  usePalette,
  SectionTitle,
} from "../../src/ui/components";
import { eventSchema, courseSchema, planSchema } from "../../src/database/entities";
import { dayKey } from "../../src/utils/dates";
import { MemoryCurve } from "../../src/ui/MemoryCurve";
export default function Stats() {
  const events = useEntities("reviewEvent").map((e) => eventSchema.parse(e));
  const courses = useEntities("course").map((c) => courseSchema.parse(c));
  const plans = useEntities("reviewPlan").map((p) => planSchema.parse(p));
  const c = usePalette();
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const reviews = events.filter((e) => e.kind === "review_completed");
  const week = startOfWeek(new Date(), { weekStartsOn: 1 });
  const month = startOfMonth(new Date());
  const onTime = reviews.filter(
    (e) =>
      e.scheduledAt &&
      new Date(e.completedAt).getTime() <=
        new Date(e.scheduledAt).getTime() + 86400000,
  ).length;
  const weekReviews = reviews.filter((e) => new Date(e.completedAt) >= week).length;
  const minutes = reviews.reduce(
    (sum, e) =>
      sum +
      (courses.find((course) => course.id === e.courseId)
        ?.estimatedReviewMinutes ?? 0),
    0,
  );
  const metricCards = [
    { label: "Cette semaine", value: weekReviews, Icon: Flame, color: c.warning, soft: c.warningSoft },
    { label: "À temps", value: `${reviews.length ? Math.round((onTime / reviews.length) * 100) : 0}%`, Icon: CalendarCheck2, color: c.success, soft: c.successSoft },
    { label: "Cours actifs", value: courses.filter((course) => course.status === "active").length, Icon: Layers3, color: c.primary, soft: c.primarySoft },
    { label: "Minutes", value: minutes, Icon: Clock3, color: c.primary, soft: c.primarySoft },
  ];
  return (
    <Screen>
      <Button secondary icon={ArrowLeft} title="Retour" onPress={() => router.back()} />
      <SectionTitle eyebrow="Tableau de bord" title="Ta progression" />
      <View style={styles.metrics}>
        {metricCards.map(({ label, value, Icon, color, soft }) => (
          <Card key={label} style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: soft }]}>
              <Icon color={color} size={21} />
            </View>
            <Text style={[styles.metricValue, { color: c.textPrimary }]}>{value}</Text>
            <Text style={[styles.metricLabel, { color: c.textSecondary }]}>{label}</Text>
          </Card>
        ))}
      </View>

      <MemoryCurve plans={plans} now={tick} />

      <SectionTitle eyebrow="Régularité" title="90 derniers jours" />
      <Card>
      <View style={styles.heatmap}>
        {Array.from({ length: 90 }, (_, i) => {
          const day = dayKey(subDays(new Date(), 89 - i));
          const n = events.filter(
            (e) => dayKey(new Date(e.completedAt)) === day,
          ).length;
          return (
            <View
              key={day}
              accessible
              accessibilityLabel={`${day} : ${n} activités`}
              style={{
                width: 16,
                height: 16,
                borderRadius: 5,
                backgroundColor: n > 2 ? c.primary : n ? c.accent : c.surfaceMuted,
              }}
            />
          );
        })}
      </View>
      <View style={styles.legend}>
        <Label muted>Calme</Label>
        <View style={[styles.dot, { backgroundColor: c.surfaceMuted }]} />
        <View style={[styles.dot, { backgroundColor: c.accent }]} />
        <View style={[styles.dot, { backgroundColor: c.primary }]} />
        <Label muted>Intense</Label>
      </View>
      </Card>
      <Card style={{ backgroundColor: c.surfaceMuted, shadowOpacity: 0 }}>
        <Label>
          {reviews.filter((e) => new Date(e.completedAt) >= month).length} révisions ce mois · {plans.filter((plan) => plan.status === "completed").length} cycles terminés
        </Label>
        <Label muted>Une révision est “à temps” jusqu’à 24 heures après son échéance.</Label>
      </Card>
      <Label muted>
        La courbe estime la probabilité moyenne de rappel à partir du délai écoulé et de l’intervalle de chaque cours. Elle s’actualise toutes les 30 secondes et ne constitue pas une mesure scientifique individuelle.
      </Label>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: { width: "48%", minHeight: 146, flexGrow: 1 },
  metricIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  metricValue: { fontSize: 30, lineHeight: 34, fontWeight: "900", letterSpacing: -1 },
  metricLabel: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  heatmap: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  legend: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 4 },
});
