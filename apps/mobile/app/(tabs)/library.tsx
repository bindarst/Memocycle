import React, { useState } from "react";
import { router } from "expo-router";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Plus, ArrowUpDown } from "lucide-react-native";
import {
  Screen,
  Label,
  Card,
  Field,
  Button,
  useEntities,
  usePalette,
  SectionTitle,
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
import { estimatePlanRetention } from "../../src/review/fsrsScheduler";
import { radius } from "../../src/theme/tokens";

type LibraryFilter =
  | "Tout"
  | "À apprendre"
  | "À réviser"
  | "En retard"
  | "Maîtrisés"
  | "Archivés";

type LibrarySort =
  | "Priorité"
  | "Prochaine révision"
  | "Matière"
  | "Dernière activité";

export default function Library() {
  const c = usePalette();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("Tout");
  const [sortBy, setSortBy] = useState<LibrarySort>("Priorité");

  const rawSubjects = useEntities("subject");
  const rawModules = useEntities("module");
  const rawCourses = useEntities("course");
  const rawPlans = useEntities("reviewPlan");

  const subjects = rawSubjects as Subject[];
  const modules = rawModules as Module[];
  const courses = rawCourses.map((e) => courseSchema.parse(e)) as Course[];
  const plans = rawPlans.map((e) => planSchema.parse(e)) as Plan[];

  const now = Date.now();
  const search = query.trim().toLocaleLowerCase("fr");

  // Filtering
  const filtered = courses.filter((course) => {
    const plan = plans.find((p) => p.courseId === course.id);
    const isArchived = Boolean(course.archivedAt || course.status === "archived");

    if (filter === "Archivés") {
      if (!isArchived) return false;
    } else if (isArchived) {
      return false;
    }

    if (filter === "À apprendre") {
      if (plan && plan.status === "active") return false;
    } else if (filter === "À réviser") {
      if (!plan || plan.status !== "active" || !plan.nextReviewAt) return false;
      const scheduledTime = new Date(plan.nextReviewAt).getTime();
      if (scheduledTime > now) return false;
    } else if (filter === "En retard") {
      if (!plan || plan.status !== "active" || !plan.nextReviewAt) return false;
      const scheduledTime = new Date(plan.nextReviewAt).getTime();
      if (scheduledTime >= now - 3600000 * 2) return false;
    } else if (filter === "Maîtrisés") {
      const retention = plan ? estimatePlanRetention(plan, now) : 0;
      if (course.status !== "completed" && retention < 0.92) return false;
    }

    // Search query matching
    const subjectTitle = subjects.find((s) => s.id === course.subjectId)?.title;
    const moduleTitle = modules.find((m) => m.id === course.moduleId)?.title;

    return [course.title, course.description, subjectTitle, moduleTitle].some(
      (s) =>
        String(s ?? "")
          .toLocaleLowerCase("fr")
          .includes(search),
    );
  });

  // Sorting
  filtered.sort((a, b) => {
    const planA = plans.find((p) => p.courseId === a.id);
    const planB = plans.find((p) => p.courseId === b.id);

    if (sortBy === "Priorité") {
      const importanceDiff = (b.importance || 2) - (a.importance || 2);
      if (importanceDiff !== 0) return importanceDiff;
      const retA = planA ? estimatePlanRetention(planA, now) : 1;
      const retB = planB ? estimatePlanRetention(planB, now) : 1;
      return retA - retB;
    }

    if (sortBy === "Prochaine révision") {
      const timeA = planA?.nextReviewAt
        ? new Date(planA.nextReviewAt).getTime()
        : Infinity;
      const timeB = planB?.nextReviewAt
        ? new Date(planB.nextReviewAt).getTime()
        : Infinity;
      return timeA - timeB;
    }

    if (sortBy === "Matière") {
      const subA =
        subjects.find((s) => s.id === a.subjectId)?.title ?? "";
      const subB =
        subjects.find((s) => s.id === b.subjectId)?.title ?? "";
      return subA.localeCompare(subB);
    }

    if (sortBy === "Dernière activité") {
      const actA = a.studiedAt
        ? new Date(a.studiedAt).getTime()
        : new Date(a.updatedAt).getTime();
      const actB = b.studiedAt
        ? new Date(b.studiedAt).getTime()
        : new Date(b.updatedAt).getTime();
      return actB - actA;
    }

    return 0;
  });

  const filterOptions: LibraryFilter[] = [
    "Tout",
    "À apprendre",
    "À réviser",
    "En retard",
    "Maîtrisés",
    "Archivés",
  ];

  const sortOptions: LibrarySort[] = [
    "Priorité",
    "Prochaine révision",
    "Matière",
    "Dernière activité",
  ];

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Label large>Bibliothèque d'étude</Label>
      </View>

      <Field
        label="Rechercher un cours ou un sujet"
        value={query}
        onChangeText={setQuery}
        placeholder="Titre, matière, concept..."
      />

      <View style={{ flexDirection: "row", gap: 10 }}>
        {subjects.length > 0 && (
          <View style={{ flex: 1 }}>
            <Button
              title="Nouveau cours"
              icon={Plus}
              onPress={() => router.push("/course/new")}
            />
          </View>
        )}
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {filterOptions.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterPill,
              {
                backgroundColor: filter === f ? c.primary : c.surface,
                borderColor: filter === f ? c.primary : c.border,
              },
            ]}
          >
            <Text
              style={{
                color: filter === f ? c.onPrimary : c.textPrimary,
                fontWeight: "700",
                fontSize: 13,
              }}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Sort selector */}
      <View style={styles.sortRow}>
        <ArrowUpDown size={15} color={c.textSecondary} />
        <Text style={{ fontSize: 13, color: c.textSecondary, fontWeight: "600" }}>
          Trier par :
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {sortOptions.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSortBy(s)}
              style={[
                styles.sortChip,
                {
                  backgroundColor: sortBy === s ? c.primarySoft : "transparent",
                  borderColor: sortBy === s ? c.primary : c.border,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: sortBy === s ? c.primary : c.textSecondary,
                }}
              >
                {s}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Subjects section */}
      <SectionTitle eyebrow="Organisation" title="Matières & Modules" />
      <EntityForm kind="subject" />

      {subjects.map((s) => (
        <Card key={s.id}>
          <Button
            secondary
            title={String(s.title)}
            onPress={() => router.push(`/subject/${s.id}`)}
          />
          <Label muted style={{ fontSize: 13 }}>
            {modules.filter((m) => m.subjectId === s.id).length} modules ·{" "}
            {courses.filter((crs) => crs.subjectId === s.id).length} cours
          </Label>
        </Card>
      ))}

      {/* Filtered Courses List */}
      <SectionTitle
        eyebrow="Résultats"
        title={`Cours (${filtered.length})`}
      />

      {!filtered.length ? (
        <Card style={{ alignItems: "center", padding: 24 }}>
          <Label muted>
            {courses.length === 0
              ? "Aucun cours pour le moment. Commence par créer une matière puis ton premier cours."
              : "Aucun cours ne correspond aux filtres actuels."}
          </Label>
        </Card>
      ) : (
        filtered.map((crs) => (
          <CourseCard
            key={crs.id}
            course={crs}
            plan={plans.find((p) => p.courseId === crs.id)}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterScroll: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
