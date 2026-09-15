import { endOfDay } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
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
import { EntityForm } from "../../src/ui/EntityForm";
import { displayDate } from "../../src/utils/dates";
import { useAuth } from "../../src/auth/AuthProvider";
import { remove } from "../../src/database/repository";

export default function Subject() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const action = useAction();
  const subject = useEntities("subject").find((s) => s.id === id);
  const modules = useEntities("module").filter((m) => m.subjectId === id);
  const courses = useEntities("course").filter((c) => c.subjectId === id);
  const plans = useEntities("reviewPlan");
  const exams = useEntities("exam")
    .filter((e) => e.subjectId === id)
    .sort((a, b) => String(a.examAt).localeCompare(String(b.examAt)));
  const active = courses.filter(
    (course) => course.status === "active" && !course.archivedAt,
  );
  const dueToday = plans.filter(
    (plan) =>
      plan.status === "active" &&
      plan.nextReviewAt &&
      new Date(String(plan.nextReviewAt)).getTime() <=
        endOfDay(new Date()).getTime() &&
      active.some((course) => course.id === plan.courseId),
  ).length;
  const nextExam = exams.find(
    (exam) => new Date(String(exam.examAt)).getTime() >= Date.now(),
  );
  const days = nextExam
    ? Math.ceil(
        (new Date(String(nextExam.examAt)).getTime() - Date.now()) / 86_400_000,
      )
    : null;
  return (
    <Screen>
      <Button secondary title="Retour" onPress={() => router.back()} />
      <Label large>{String(subject?.title ?? "Matière introuvable")}</Label>
      {!!subject?.description && <Label>{String(subject.description)}</Label>}
      {nextExam && (
        <Card>
          <Label>
            {days === 0
              ? "Examen aujourd’hui"
              : `Examen dans ${days} jour${days === 1 ? "" : "s"}`}
          </Label>
          <Label muted>
            {String(nextExam.title)} · {displayDate(String(nextExam.examAt))}
          </Label>
          {!courses.some((course) => course.studiedAt) && (
            <Label muted>Aucun cours de cette matière n’a encore été étudié.</Label>
          )}
        </Card>
      )}
      <Card>
        <Label>
          {modules.length} module{modules.length === 1 ? "" : "s"} · {courses.length}{" "}
          cours
        </Label>
        <Label>Aujourd’hui · {dueToday} révision{dueToday === 1 ? "" : "s"}</Label>
        <Label>Progression · {active.length} / {courses.length} cours actifs</Label>
      </Card>
      {subject && <EntityForm kind="subject" entityId={id} />}
      {exams.map((exam) => (
        <Card key={exam.id}>
          <Label>{String(exam.title)}</Label>
          <Label muted>{displayDate(String(exam.examAt))}</Label>
          <EntityForm kind="exam" subjectId={id} entityId={exam.id} />
          <Button
            danger
            title="Supprimer cette date d’examen"
            onPress={() =>
              confirm(
                "Supprimer cette date d’examen ?",
                "Elle disparaîtra du calendrier.",
                () => void action.run(() => remove("exam", exam.id, userId)),
              )
            }
          />
        </Card>
      ))}
      <EntityForm kind="module" subjectId={id} />
      <EntityForm kind="exam" subjectId={id} />
      <Button
        title="Ajouter un cours"
        onPress={() =>
          router.push({ pathname: "/course/new", params: { subjectId: id } })
        }
      />
      {modules.map((module) => (
        <Button
          secondary
          key={module.id}
          title={String(module.title)}
          onPress={() => router.push(`/module/${module.id}`)}
        />
      ))}
      {courses
        .filter((course) => !course.moduleId)
        .map((course) => (
          <Button
            secondary
            key={course.id}
            title={String(course.title)}
            onPress={() => router.push(`/course/${course.id}`)}
          />
        ))}
      {subject && modules.length === 0 && courses.length === 0 && exams.length === 0 && (
        <Button
          danger
          title="Supprimer cette matière"
          onPress={() =>
            confirm(
              "Supprimer cette matière ?",
              "Cette action supprimera la matière de tous tes appareils.",
              () =>
                void action.run(async () => {
                  await remove("subject", id, userId);
                  router.back();
                }),
            )
          }
        />
      )}
      <ErrorText message={action.error} />
    </Screen>
  );
}
