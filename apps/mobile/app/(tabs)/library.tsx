import { useState } from "react";
import { router } from "expo-router";
import {
  Screen,
  Label,
  Card,
  Field,
  Button,
  useEntities,
} from "../../src/ui/components";
import { EntityForm } from "../../src/ui/EntityForm";
import { CourseCard } from "../../src/ui/CourseCard";
import { courseSchema, planSchema } from "../../src/database/entities";
export default function Library() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Tout");
  const subjects = useEntities("subject");
  const modules = useEntities("module");
  const courses = useEntities("course").map((e) => courseSchema.parse(e));
  const plans = useEntities("reviewPlan").map((e) => planSchema.parse(e));
  const search = query.trim().toLocaleLowerCase("fr");
  const filtered = courses.filter(
    (c) =>
      (filter === "Tout" ||
        c.status ===
          (
            {
              Actifs: "active",
              Terminés: "completed",
              Archivés: "archived",
            } as Record<string, string>
          )[filter]) &&
      [
        c.title,
        c.description,
        subjects.find((s) => s.id === c.subjectId)?.title,
        modules.find((m) => m.id === c.moduleId)?.title,
      ].some((s) =>
        String(s ?? "")
          .toLocaleLowerCase("fr")
          .includes(search),
      ),
  );
  return (
    <Screen>
      <Label large>Bibliothèque</Label>
      <Field
        label="Rechercher un cours"
        value={query}
        onChangeText={setQuery}
      />
      <EntityForm kind="subject" />
      {subjects.length > 0 && (
        <Button
          title="Ajouter un cours"
          onPress={() => router.push("/course/new")}
        />
      )}
      <Card>
        {["Tout", "Actifs", "Terminés", "Archivés"].map((f) => (
          <Button
            key={f}
            secondary={f !== filter}
            title={f}
            onPress={() => setFilter(f)}
          />
        ))}
      </Card>
      {!courses.length && (
        <Label muted>
          Aucun cours pour le moment. Commence par créer une matière.
        </Label>
      )}
      {subjects.map((s) => (
        <Card key={s.id}>
          <Button
            secondary
            title={String(s.title)}
            onPress={() => router.push(`/subject/${s.id}`)}
          />
          <Label muted>
            {modules.filter((m) => m.subjectId === s.id).length} modules ·{" "}
            {courses.filter((c) => c.subjectId === s.id).length} cours
          </Label>
        </Card>
      ))}
      {filtered.map((c) => (
        <CourseCard
          key={c.id}
          course={c}
          plan={plans.find((p) => p.courseId === c.id)}
        />
      ))}
    </Screen>
  );
}
