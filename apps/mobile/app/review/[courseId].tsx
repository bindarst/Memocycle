import { useRef, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  Screen,
  Label,
  Button,
  Card,
  ErrorText,
  useAction,
  useEntities,
  confirm,
} from "../../src/ui/components";
import { courseSchema, planSchema } from "../../src/database/entities";
import { useAuth } from "../../src/auth/AuthProvider";
import { completeReview } from "../../src/review/reviewService";
import { newId } from "../../src/utils/ids";
import { displayDate } from "../../src/utils/dates";
export default function Review() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { userId } = useAuth();
  const a = useAction();
  const mutation = useRef(newId());
  const locked = useRef(false);
  const [done, setDone] = useState(false);
  const raw = useEntities("course").find((c) => c.id === courseId);
  const rawPlan = useEntities("reviewPlan").find(
    (p) => p.courseId === courseId,
  );
  const subjects = useEntities("subject");
  const modules = useEntities("module");
  if (!raw || !rawPlan)
    return (
      <Screen>
        <Label>Ce cours n’a pas de révision active.</Label>
        <Button title="Retour" onPress={() => router.back()} />
      </Screen>
    );
  const course = courseSchema.parse(raw);
  const plan = planSchema.parse(rawPlan);
  const complete = () => {
    if (locked.current) return;
    locked.current = true;
    void a.run(async () => {
      try {
        await completeReview(userId, courseId, "complete", mutation.current);
        setDone(true);
      } catch (e) {
        locked.current = false;
        throw e;
      }
    });
  };
  return (
    <Screen>
      <Button secondary title="Fermer" onPress={() => router.back()} />
      <Label muted>
        {String(subjects.find((s) => s.id === course.subjectId)?.title ?? "")}{" "}
        {String(modules.find((m) => m.id === course.moduleId)?.title ?? "")}
      </Label>
      <Label large>{course.title}</Label>
      {course.description && <Label>{course.description}</Label>}
      {done ? (
        <Card>
          <Label large>✓ Révision enregistrée</Label>
          <Label>
            {plan.nextReviewAt
              ? `Prochaine révision : ${displayDate(plan.nextReviewAt)}`
              : "Cycle terminé"}
          </Label>
          <Button title="Terminer" onPress={() => router.back()} />
        </Card>
      ) : (
        <>
          <Label>Révision {plan.currentStep} sur 6</Label>
          <Button
            title="J’ai terminé ma révision"
            disabled={a.busy || plan.status !== "active" || !!course.archivedAt}
            onPress={() => {
              if (
                plan.nextReviewAt &&
                new Date(plan.nextReviewAt).getTime() - Date.now() >
                  12 * 3600000
              )
                confirm(
                  "Valider maintenant ?",
                  "Cette révision était prévue plus tard. Le prochain délai commencera maintenant.",
                  complete,
                );
              else complete();
            }}
          />
        </>
      )}
      <ErrorText message={a.error} />
    </Screen>
  );
}
