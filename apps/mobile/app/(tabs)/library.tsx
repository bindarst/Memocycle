import React, { useState } from "react";
import { router } from "expo-router";
import { View, Text } from "react-native";
import { Add01Icon, Book01Icon } from "@hugeicons/core-free-icons";
import {
  Screen,
  Label,
  Card,
  Field,
  Button,
  useEntities,
  usePalette,
  SectionTitle,
  SegmentedControl,
  ListRow,
} from "../../src/ui/components";
import { EntityForm } from "../../src/ui/EntityForm";
import { CourseCard } from "../../src/ui/CourseCard";
import {
  courseSchema,
  planSchema,
  type Course,
  type Plan,
  type Subject,
  type Module,
} from "../../src/database/entities";

type LibraryFilter = "Tout" | "Actifs" | "Terminés" | "Archivés";

export default function Library() {
  const c = usePalette();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("Tout");

  const rawSubjects = useEntities("subject");
  const rawModules = useEntities("module");
  const rawCourses = useEntities("course");
  const rawPlans = useEntities("reviewPlan");

  const subjects = rawSubjects as Subject[];
  const modules = rawModules as Module[];
  const courses = rawCourses.map((e) => courseSchema.parse(e)) as Course[];
  const plans = rawPlans.map((e) => planSchema.parse(e)) as Plan[];

  const search = query.trim().toLocaleLowerCase("fr");

  const filtered = courses.filter((course) => {
    const isArchived = Boolean(course.archivedAt || course.status === "archived");

    if (filter === "Archivés") {
      if (!isArchived) return false;
    } else {
      if (isArchived) return false;
      if (filter === "Actifs" && course.status === "completed") return false;
      if (filter === "Terminés" && course.status !== "completed") return false;
    }

    if (!search) return true;

    const subjectTitle = subjects.find((s) => s.id === course.subjectId)?.title;
    const moduleTitle = modules.find((m) => m.id === course.moduleId)?.title;

    return [course.title, course.description, subjectTitle, moduleTitle].some(
      (s) =>
        String(s ?? "")
          .toLocaleLowerCase("fr")
          .includes(search),
    );
  });

  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Label large>Cours</Label>
        <Button
          size="sm"
          icon={Add01Icon}
          title="Nouveau cours"
          onPress={() => router.push("/course/new")}
        />
      </View>

      <Field
        label="Recherche"
        value={query}
        onChangeText={setQuery}
        placeholder="Titre, matière, module..."
      />

      {/* Filter SegmentedControl */}
      <SegmentedControl
        options={[
          { label: "Tout", value: "Tout" },
          { label: "Actifs", value: "Actifs" },
          { label: "Terminés", value: "Terminés" },
          { label: "Archivés", value: "Archivés" },
        ]}
        value={filter}
        onChange={(v) => setFilter(v as LibraryFilter)}
      />

      {/* Subjects section */}
      <SectionTitle
        title="Matières"
        action={<EntityForm kind="subject" />}
      />

      {subjects.length > 0 ? (
        <View style={{ gap: 8 }}>
          {subjects.map((s) => {
            const moduleCount = modules.filter((m) => m.subjectId === s.id).length;
            const courseCount = courses.filter((crs) => crs.subjectId === s.id).length;
            return (
              <ListRow
                key={s.id}
                icon={Book01Icon}
                title={String(s.title)}
                subtitle={`${moduleCount} module${moduleCount > 1 ? "s" : ""} · ${courseCount} cours`}
                showChevron
                onPress={() => router.push(`/subject/${s.id}`)}
              />
            );
          })}
        </View>
      ) : (
        <Card style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
          <Text style={{ fontSize: 13, color: c.textSecondary }}>
            Aucune matière créée.
          </Text>
        </Card>
      )}

      {/* Courses List */}
      <SectionTitle title={`Tous les cours (${filtered.length})`} />

      {!filtered.length ? (
        <Card style={{ alignItems: "center", paddingVertical: 20 }}>
          <Text style={{ fontSize: 13, color: c.textSecondary }}>
            {courses.length === 0 ? "Aucun cours" : "Aucun résultat"}
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 8 }}>
          {filtered.map((crs) => (
            <CourseCard
              key={crs.id}
              course={crs}
              plan={plans.find((p) => p.courseId === crs.id)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

