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
import { useAuth } from "../../src/auth/AuthProvider";
import { remove } from "../../src/database/repository";
import { displayDate } from "../../src/utils/dates";

export default function Module() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const action = useAction();
  const module = useEntities("module").find((m) => m.id === id);
  const subject = useEntities("subject").find(
    (item) => item.id === module?.subjectId,
  );
  const courses = useEntities("course").filter((c) => c.moduleId === id);
  const exams = useEntities("exam").filter((exam) => exam.moduleId === id);
  return (
    <Screen>
      <Button secondary title="Retour" onPress={() => router.back()} />
      <Label muted>{String(subject?.title ?? "")}</Label>
      <Label large>{String(module?.title ?? "Module introuvable")}</Label>
      {!!module?.description && <Label>{String(module.description)}</Label>}
      {module && (
        <EntityForm
          kind="module"
          subjectId={String(module.subjectId)}
          entityId={id}
        />
      )}
      {exams.map((exam) => (
        <Card key={exam.id}>
          <Label>{String(exam.title)}</Label>
          <Label muted>{displayDate(String(exam.examAt))}</Label>
          <EntityForm
            kind="exam"
            subjectId={String(module?.subjectId)}
            moduleId={id}
            entityId={exam.id}
          />
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
      {module && (
        <EntityForm
          kind="exam"
          subjectId={String(module.subjectId)}
          moduleId={id}
        />
      )}
      <Button
        title="Ajouter un cours"
        onPress={() =>
          router.push({
            pathname: "/course/new",
            params: { subjectId: String(module?.subjectId), moduleId: id },
          })
        }
      />
      {courses.map((course) => (
        <Button
          secondary
          key={course.id}
          title={String(course.title)}
          onPress={() => router.push(`/course/${course.id}`)}
        />
      ))}
      {module && courses.length === 0 && exams.length === 0 && (
        <Button
          danger
          title="Supprimer ce module"
          onPress={() =>
            confirm(
              "Supprimer ce module ?",
              "Cette action supprimera le module de tous tes appareils.",
              () =>
                void action.run(async () => {
                  await remove("module", id, userId);
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
