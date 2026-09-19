import React from "react";
import { endOfDay } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { View, Text } from "react-native";
import {
  ArrowLeft01Icon,
  Book01Icon,
  Folder01Icon,
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
import { displayDate } from "../../src/utils/dates";
import { useAuth } from "../../src/auth/AuthProvider";
import { remove } from "../../src/database/repository";
import { LocalPdfSection } from "../../src/ui/LocalPdfSection";
import { AppIcon } from "../../src/ui/Icon";
import { subjectCategory, subjectColor } from "../../src/ui/subjectAppearance";

export default function Subject() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const action = useAction();
  const c = usePalette();

  const subject = useEntities("subject").find((s) => s.id === id);
  const modules = useEntities("module").filter((m) => m.subjectId === id);
  const courses = useEntities("course").filter((item) => item.subjectId === id);
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
  const category = subjectCategory(subject?.iconKey);
  const accent = subjectColor(subject?.colorKey);

  return (
    <Screen>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton
          icon={ArrowLeft01Icon}
          accessibilityLabel="Retour"
          onPress={() => router.back()}
        />
        {subject && (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: accent.color,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppIcon icon={category.icon} size={23} color="#FFFFFF" />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Label large>{String(subject?.title ?? "Matière introuvable")}</Label>
          {subject && (
            <Text style={{ fontSize: 12, fontWeight: "600", color: accent.color }}>
              {category.label}
            </Text>
          )}
        </View>
        {subject && <EntityForm kind="subject" entityId={id} />}
      </View>

      {!!subject?.description && (
        <Text style={{ fontSize: 14, color: c.textSecondary }}>
          {String(subject.description)}
        </Text>
      )}

      {subject && <LocalPdfSection parentType="subject" parentId={id} />}

      {/* Overview stats card */}
      <Card
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          paddingVertical: 10,
        }}
      >
        <View style={{ alignItems: "center", gap: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.textPrimary }}>
            {modules.length}
          </Text>
          <Text style={{ fontSize: 12, color: c.textSecondary }}>Modules</Text>
        </View>
        <View style={{ alignItems: "center", gap: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.textPrimary }}>
            {courses.length}
          </Text>
          <Text style={{ fontSize: 12, color: c.textSecondary }}>Cours</Text>
        </View>
        <View style={{ alignItems: "center", gap: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.textPrimary }}>
            {dueToday}
          </Text>
          <Text style={{ fontSize: 12, color: c.textSecondary }}>À réviser</Text>
        </View>
        {days !== null && (
          <View style={{ alignItems: "center", gap: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: c.warning }}>
              {days === 0 ? "Auj." : `J-${days}`}
            </Text>
            <Text style={{ fontSize: 12, color: c.textSecondary }}>Examen</Text>
          </View>
        )}
      </Card>

      {/* Modules section */}
      <SectionTitle
        title="Modules"
        action={<EntityForm kind="module" subjectId={id} />}
      />
      {modules.length > 0 ? (
        <View style={{ gap: 6 }}>
          {modules.map((m) => {
            const modCourses = courses.filter((crs) => crs.moduleId === m.id).length;
            return (
              <ListRow
                key={m.id}
                icon={Folder01Icon}
                title={String(m.title)}
                subtitle={`${modCourses} cours`}
                showChevron
                onPress={() => router.push(`/module/${m.id}`)}
              />
            );
          })}
        </View>
      ) : (
        <Card style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
          <Text style={{ fontSize: 13, color: c.textSecondary }}>
            Aucun module
          </Text>
        </Card>
      )}

      {/* Courses section */}
      <SectionTitle
        title="Cours"
        action={
          <Button
            size="sm"
            variant="secondary"
            icon={Add01Icon}
            title="Cours"
            onPress={() =>
              router.push({ pathname: "/course/new", params: { subjectId: id } })
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
            Aucun cours dans cette matière
          </Text>
        </Card>
      )}

      {/* Exams section */}
      <SectionTitle
        title="Examens"
        action={<EntityForm kind="exam" subjectId={id} />}
      />
      {exams.length > 0 ? (
        <View style={{ gap: 6 }}>
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
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: c.textPrimary }}>
                  {String(exam.title)}
                </Text>
                <Text style={{ fontSize: 12, color: c.textSecondary }}>
                  {displayDate(String(exam.examAt))}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <EntityForm kind="exam" entityId={exam.id} triggerTitle="Modifier" triggerVariant="ghost" />
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
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {/* Delete Subject if empty */}
      {subject && modules.length === 0 && courses.length === 0 && exams.length === 0 && (
        <View style={{ marginTop: 12 }}>
          <Button
            size="sm"
            variant="destructive"
            icon={Delete02Icon}
            title="Supprimer cette matière"
            onPress={() =>
              confirm(
                "Supprimer cette matière ?",
                "Cette action supprimera la matière.",
                () =>
                  void action.run(async () => {
                    await remove("subject", id, userId);
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
