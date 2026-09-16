import { router } from "expo-router";
import { View } from "react-native";
import { BookOpen, ChevronRight, Clock3 } from "lucide-react-native";
import { Card, Label, Button, Pill, useEntities, usePalette } from "./components";
import type { Course, Plan } from "../database/entities";
import { displayDate, lateness } from "../utils/dates";
export function CourseCard({ course, plan }: { course: Course; plan?: Plan }) {
  const c = usePalette();
  const subject = useEntities("subject").find((s) => s.id === course.subjectId);
  const overdue = !!plan?.nextReviewAt && new Date(plan.nextReviewAt).getTime() < Date.now();
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
        <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <BookOpen color={c.primary} size={23} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Label style={{ fontWeight: "800", fontSize: 17 }}>{course.title}</Label>
          <Label muted style={{ fontSize: 13 }}>{String(subject?.title ?? "Sans matière")}</Label>
        </View>
        {overdue ? <Pill tone="warning">À faire</Pill> : plan?.nextReviewAt ? <Pill>Planifié</Pill> : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        <Clock3 color={c.textSecondary} size={16} />
        <Label muted style={{ fontSize: 13 }}>environ {course.estimatedReviewMinutes} min</Label>
      </View>
      {plan?.nextReviewAt ? (
        <>
          <Label muted style={{ fontSize: 13 }}>Révision {plan.currentStep}/6</Label>
          <Label style={{ fontWeight: "700" }}>
            {new Date(plan.nextReviewAt).getTime() < Date.now()
              ? lateness(plan.nextReviewAt)
              : displayDate(plan.nextReviewAt)}
          </Label>
        </>
      ) : (
        <Label muted>
          {course.status === "completed"
            ? "Cycle terminé"
            : course.status === "archived"
              ? "Archivé"
              : "Pas encore étudié"}
        </Label>
      )}
      <Button
        secondary
        icon={ChevronRight}
        title={plan?.nextReviewAt ? "Réviser" : "Ouvrir le cours"}
        onPress={() =>
          router.push(
            plan?.nextReviewAt
              ? `/review/${course.id}`
              : `/course/${course.id}`,
          )
        }
      />
    </Card>
  );
}
