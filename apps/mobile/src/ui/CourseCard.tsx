import { router } from "expo-router";
import { Card, Label, Button, useEntities } from "./components";
import type { Course, Plan } from "../database/entities";
import { displayDate, lateness } from "../utils/dates";
export function CourseCard({ course, plan }: { course: Course; plan?: Plan }) {
  const subject = useEntities("subject").find((s) => s.id === course.subjectId);
  return (
    <Card>
      <Label>{course.title}</Label>
      <Label muted>
        {String(subject?.title ?? "")} · environ {course.estimatedReviewMinutes}{" "}
        min
      </Label>
      {plan?.nextReviewAt ? (
        <>
          <Label muted>Révision {plan.currentStep}/6</Label>
          <Label>
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
