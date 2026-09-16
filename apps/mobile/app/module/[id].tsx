import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View, Text } from "react-native";
import {
  ArrowLeft01Icon,
  Book01Icon,
  Add01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import {
  Screen,
  Label,
  Card,
  Button,
  IconButton,
  ListRow,
  ErrorText,
  useAction,
  useEntities,
  confirm,
  SectionTitle,
  usePalette,
} from "../../src/ui/components";
import { EntityForm } from "../../src/ui/EntityForm";
import { useAuth } from "../../src/auth/AuthProvider";
import { remove } from "../../src/database/repository";
import { displayDate } from "../../src/utils/dates";

export default function Module() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const action = useAction();
  const c = usePalette();

  const module = useEntities("module").find((m) => m.id === id);
  const subject = useEntities("subject").find(
    (item) => item.id === module?.subjectId,
  );
  const courses = useEntities("course").filter((itemCourse) => itemCourse.moduleId === id);
  const exams = useEntities("exam").filter((exam) => exam.moduleId === id);

  return (
    <Screen>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton
          icon={ArrowLeft01Icon}
          accessibilityLabel="Retour"
          onPress={() => router.back()}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: c.textSecondary }}>
            {String(subject?.title ?? "")}
          </Text>
          <Label large>{String(module?.title ?? "Module introuvable")}</Label>
        </View>
        {module && (
          <EntityForm
            kind="module"
            subjectId={String(module.subjectId)}
            entityId={id}
          />
        )}
      </View>

      {!!module?.description && (
        <Text style={{ fontSize: 14, color: c.textSecondary }}>
          {String(module.description)}
        </Text>
      )}

      {/* Courses section */}
      <SectionTitle
        title={`Cours (${courses.length})`}
        action={
          <Button
            size="sm"
            variant="secondary"
            icon={Add01Icon}
            title="Cours"
            onPress={() =>
              router.push({
                pathname: "/course/new",
                params: { subjectId: String(module?.subjectId), moduleId: id },
              })
            }
          />
        }
      />

      {courses.length > 0 ? (
        <View style={{ gap: 6 }}>
          {courses.map((crs) => (
            <ListRow
              key={crs.id}
              icon={Book01Icon}
              title={String(crs.title)}
              rightText={crs.estimatedReviewMinutes ? `${crs.estimatedReviewMinutes} min` : undefined}
              showChevron
              onPress={() => router.push(`/course/${crs.id}`)}
            />
          ))}
        </View>
      ) : (
        <Card style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
          <Text style={{ fontSize: 13, color: c.textSecondary }}>
            Aucun cours dans ce module
          </Text>
        </Card>
      )}

      {/* Exams section */}
      {exams.length > 0 && (
        <View style={{ gap: 6 }}>
          <SectionTitle
            title="Examens"
            action={
              module && (
                <EntityForm
                  kind="exam"
                  subjectId={String(module.subjectId)}
                  moduleId={id}
                />
              )
            }
          />
          {exams.map((exam) => (
            <Card
              key={exam.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: c.textPrimary }}>
                  {String(exam.title)}
                </Text>
                <Text style={{ fontSize: 12, color: c.textSecondary }}>
                  {displayDate(String(exam.examAt))}
                </Text>
              </View>
              <IconButton
                icon={Delete02Icon}
                accessibilityLabel="Supprimer examen"
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
        </View>
      )}

      {/* Delete Module if empty */}
      {module && courses.length === 0 && exams.length === 0 && (
        <View style={{ marginTop: 12 }}>
          <Button
            size="sm"
            variant="destructive"
            icon={Delete02Icon}
            title="Supprimer ce module"
            onPress={() =>
              confirm(
                "Supprimer ce module ?",
                "Cette action supprimera le module.",
                () =>
                  void action.run(async () => {
                    await remove("module", id, userId);
                    router.back();
                  }),
              )
            }
          />
        </View>
      )}

      <ErrorText message={action.error} />
    </Screen>
  );
}

