import { router } from "expo-router";
import { startOfWeek, startOfMonth, subDays } from "date-fns";
import { View } from "react-native";
import {
  Screen,
  Label,
  Card,
  Button,
  useEntities,
  usePalette,
} from "../../src/ui/components";
import { eventSchema, courseSchema } from "../../src/database/entities";
import { dayKey } from "../../src/utils/dates";
export default function Stats() {
  const events = useEntities("reviewEvent").map((e) => eventSchema.parse(e));
  const courses = useEntities("course").map((c) => courseSchema.parse(c));
  const plans = useEntities("reviewPlan");
  const c = usePalette();
  const reviews = events.filter((e) => e.kind === "review_completed");
  const week = startOfWeek(new Date(), { weekStartsOn: 1 });
  const month = startOfMonth(new Date());
  const onTime = reviews.filter(
    (e) =>
      e.scheduledAt &&
      new Date(e.completedAt).getTime() <=
        new Date(e.scheduledAt).getTime() + 86400000,
  ).length;
  return (
    <Screen>
      <Button secondary title="Retour" onPress={() => router.back()} />
      <Label large>Ta progression</Label>
      <Card>
        <Label>
          {reviews.filter((e) => new Date(e.completedAt) >= week).length}{" "}
          révisions cette semaine
        </Label>
        <Label>
          {reviews.filter((e) => new Date(e.completedAt) >= month).length}{" "}
          révisions ce mois
        </Label>
        <Label>
          {courses.filter((c) => c.status === "active").length} cours actifs
        </Label>
        <Label>
          {plans.filter((plan) => plan.status === "completed").length} cycles
          terminés
        </Label>
        <Label>
          {reviews.length ? Math.round((onTime / reviews.length) * 100) : 0} %
          de révisions à temps
        </Label>
        <Label muted>À temps : avant l’échéance + 24 heures.</Label>
        <Label>
          Environ{" "}
          {reviews.reduce(
            (sum, e) =>
              sum +
              (courses.find((c) => c.id === e.courseId)
                ?.estimatedReviewMinutes ?? 0),
            0,
          )}{" "}
          minutes consacrées
        </Label>
      </Card>
      <Label>Activité des 90 derniers jours</Label>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
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
                width: 20,
                height: 20,
                borderRadius: 4,
                backgroundColor: n ? c.success : c.border,
              }}
            />
          );
        })}
      </View>
      <Label muted>
        Ces chiffres décrivent ton activité, pas une mesure scientifique de ta
        mémoire.
      </Label>
    </Screen>
  );
}
