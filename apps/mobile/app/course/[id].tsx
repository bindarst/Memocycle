import { router, useLocalSearchParams } from "expo-router";
import { courseInput } from "@memocycle/contracts";
import {
  Screen,
  Label,
  Card,
  Button,
  ErrorText,
  useAction,
  useEntities,
  confirm,
} from "../../src/ui/components";
import {
  courseSchema,
  planSchema,
  eventSchema,
} from "../../src/database/entities";
import { useAuth } from "../../src/auth/AuthProvider";
import { save, remove } from "../../src/database/repository";
import { completeReview } from "../../src/review/reviewService";
import { newId } from "../../src/utils/ids";
import { displayDate } from "../../src/utils/dates";
export default function CourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const a = useAction();
  const raw = useEntities("course").find((c) => c.id === id);
  const planRaw = useEntities("reviewPlan").find((p) => p.courseId === id);
  const subjects = useEntities("subject");
  const modules = useEntities("module");
  const events = useEntities("reviewEvent")
    .map((e) => eventSchema.parse(e))
    .filter((e) => e.courseId === id)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  if (!raw)
    return (
      <Screen>
        <Label>Cours introuvable</Label>
        <Button title="Retour" onPress={() => router.back()} />
      </Screen>
    );
  const course = courseSchema.parse(raw);
  const plan = planRaw ? planSchema.parse(planRaw) : null;
  const cycleEvents = plan
    ? events.filter((event) => event.cycle === plan.scheduleVersion)
    : [];
  const timeline = ["Étudié", "J+1", "J+3", "J+7", "J+14", "J+30", "J+60"];
  return (
    <Screen>
      <Button secondary title="Retour" onPress={() => router.back()} />
      <Label muted>
        {String(modules.find((module) => module.id === course.moduleId)?.title ?? "")}
        {course.moduleId ? " · " : ""}
        {String(subjects.find((subject) => subject.id === course.subjectId)?.title ?? "")}
      </Label>
      <Label large>{course.title}</Label>
      {course.description && <Label>{course.description}</Label>}
      <Card>
        <Label>
          {plan?.nextReviewAt
            ? `Prochaine révision : ${displayDate(plan.nextReviewAt)}`
            : plan?.status === "completed"
              ? "Cycle terminé · 6 révisions effectuées"
              : "Pas encore étudié"}
        </Label>
        {plan && <Label muted>Étape {plan.currentStep} sur 6</Label>}
        {course.archivedAt && <Label muted>Cours archivé</Label>}
      </Card>
      {plan && (
        <Card>
          <Label>Progression</Label>
          {timeline.map((label, index) => {
            const event =
              index === 0
                ? cycleEvents.find(
                    (item) =>
                      item.kind === "initial_study" ||
                      item.kind === "schedule_restarted",
                  )
                : cycleEvents.find(
                    (item) =>
                      item.kind === "review_completed" &&
                      item.stepIndex === index,
                  );
            const next =
              !event &&
              index > 0 &&
              plan.status === "active" &&
              plan.currentStep === index;
            return (
              <Label key={label} muted={!event && !next}>
                {label} · {event ? `✓ ${new Date(event.completedAt).toLocaleDateString("fr-BE")}` : next && plan.nextReviewAt ? `● ${displayDate(plan.nextReviewAt)}` : "○"}
              </Label>
            );
          })}
        </Card>
      )}
      {!course.archivedAt && (
        <Button
          title={
            !plan
              ? "J’ai étudié ce cours"
              : plan.status === "completed"
                ? "Recommencer un cycle"
                : "Réviser maintenant"
          }
          disabled={a.busy}
          onPress={() => {
            if (plan?.status === "active") router.push(`/review/${id}`);
            else
              void a.run(() =>
                completeReview(userId, id, plan ? "restart" : "start", newId()),
              );
          }}
        />
      )}
      <ErrorText message={a.error} />
      <Button
        secondary
        title="Modifier le cours"
        onPress={() => router.push(`/course/edit/${id}`)}
      />
      <Button
        secondary
        title={course.archivedAt ? "Désarchiver" : "Archiver"}
        onPress={() =>
          void a.run(async () => {
            const input = courseInput.parse(
              Object.fromEntries(
                Object.keys(courseInput.shape).map((k) => [
                  k,
                  course[k as keyof typeof course],
                ]),
              ),
            );
            await save(
              "course",
              userId,
              {
                ...input,
                archivedAt: course.archivedAt ? null : new Date().toISOString(),
              },
              id,
            );
          })
        }
      />
      <Button
        danger
        title="Supprimer ce cours"
        onPress={() =>
          confirm(
            "Supprimer ce cours ?",
            "Son planning et son historique seront également supprimés.",
            () =>
              void a.run(async () => {
                await remove("course", id, userId);
                router.back();
              }),
          )
        }
      />
      <Label large>Historique</Label>
      {events.map((e) => (
        <Card key={e.id}>
          <Label>
            {e.kind === "review_completed"
              ? `Révision ${e.stepIndex}/6`
              : e.kind === "initial_study"
                ? "Étude initiale"
                : "Nouveau cycle"}
          </Label>
          <Label muted>
            {displayDate(e.completedAt)} · Cycle {e.cycle}
          </Label>
        </Card>
      ))}
    </Screen>
  );
}
