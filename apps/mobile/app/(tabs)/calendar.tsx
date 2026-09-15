import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  format,
  getISODay,
  isToday,
  isTomorrow,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { View, Pressable } from "react-native";
import {
  Screen,
  Label,
  Card,
  Button,
  useEntities,
  usePalette,
} from "../../src/ui/components";
import { dayKey, displayDate } from "../../src/utils/dates";
export default function Calendar() {
  const [month, setMonth] = useState(new Date());
  const [mode, setMode] = useState<"Agenda" | "Mois">("Agenda");
  const [selected, setSelected] = useState(dayKey());
  const plans = useEntities("reviewPlan");
  const courses = useEntities("course");
  const exams = useEntities("exam");
  const c = usePalette();
  const items = [
    ...plans
      .filter(
        (p) =>
          p.status === "active" &&
          p.nextReviewAt &&
          courses.some((c) => c.id === p.courseId && !c.archivedAt),
      )
      .map((p) => ({
        id: p.id,
        at: String(p.nextReviewAt),
        title: String(
          courses.find((c) => c.id === p.courseId)?.title ?? "Révision",
        ),
      })),
    ...exams
      .filter(
        (exam) =>
          new Date(String(exam.examAt)).getTime() >=
          startOfDay(new Date()).getTime(),
      )
      .map((e) => ({
        id: e.id,
        at: String(e.examAt),
        title: `Examen · ${e.title}`,
      })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const agendaDays = [...new Set(items.map((item) => dayKey(new Date(item.at))))];
  return (
    <Screen>
      <Label large>Calendrier</Label>
      <Button
        secondary
        title={mode === "Agenda" ? "Afficher le mois" : "Afficher l’agenda"}
        onPress={() => setMode(mode === "Agenda" ? "Mois" : "Agenda")}
      />
      {mode === "Mois" && (
        <Card>
          <Label>{format(month, "MMMM yyyy", { locale: fr })}</Label>
          <Button
            secondary
            title="Mois précédent"
            onPress={() => setMonth(addMonths(month, -1))}
          />
          <Button
            secondary
            title="Mois suivant"
            onPress={() => setMonth(addMonths(month, 1))}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {Array.from(
              { length: getISODay(startOfMonth(month)) - 1 },
              (_, i) => (
                <View key={`blank${i}`} style={{ width: "14.28%" }} />
              ),
            )}
            {eachDayOfInterval({
              start: startOfMonth(month),
              end: endOfMonth(month),
            }).map((d) => (
              <Pressable
                accessibilityLabel={format(d, "EEEE d MMMM", { locale: fr })}
                key={dayKey(d)}
                onPress={() => setSelected(dayKey(d))}
                style={{
                  width: "14.28%",
                  minHeight: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    selected === dayKey(d) ? c.border : c.surface,
                }}
              >
                <Label>
                  {format(d, "d")}
                  {items.some((i) => dayKey(new Date(i.at)) === dayKey(d))
                    ? " •"
                    : ""}
                </Label>
              </Pressable>
            ))}
          </View>
        </Card>
      )}
      {mode === "Agenda"
        ? agendaDays.map((day) => {
            const date = new Date(`${day}T12:00:00`);
            const dayItems = items.filter(
              (item) => dayKey(new Date(item.at)) === day,
            );
            const reviews = dayItems.filter(
              (item) => !item.title.startsWith("Examen ·"),
            ).length;
            return (
              <View key={day} style={{ gap: 12 }}>
                <Label large>
                  {isToday(date)
                    ? "Aujourd’hui"
                    : isTomorrow(date)
                      ? "Demain"
                      : format(date, "EEEE d MMMM", { locale: fr })}
                </Label>
                {reviews > 0 && (
                  <Label muted>
                    {reviews} révision{reviews === 1 ? "" : "s"}
                  </Label>
                )}
                {dayItems.map((item) => (
                  <Card key={item.id}>
                    <Label>{item.title}</Label>
                    <Label muted>{displayDate(item.at)}</Label>
                  </Card>
                ))}
              </View>
            );
          })
        : items
            .filter((item) => dayKey(new Date(item.at)) === selected)
            .map((item) => (
              <Card key={item.id}>
                <Label>{item.title}</Label>
                <Label muted>{displayDate(item.at)}</Label>
              </Card>
            ))}
      {!items.length && (
        <Label muted>
          Tes prochaines révisions et dates d’examen apparaîtront ici.
        </Label>
      )}
    </Screen>
  );
}
