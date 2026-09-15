import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { router } from "expo-router";
import { courseInput } from "@memocycle/contracts";
import { useAuth } from "../auth/AuthProvider";
import { save } from "../database/repository";
import {
  Screen,
  Label,
  Field,
  Button,
  ErrorText,
  useAction,
  useEntities,
} from "./components";
type Values = {
  title: string;
  description: string;
  subjectId: string;
  moduleId: string;
  minutes: string;
  importance: string;
};
export function CourseForm({
  id,
  subjectId: initialSubject,
  moduleId: initialModule,
}: {
  id?: string;
  subjectId?: string;
  moduleId?: string;
}) {
  const { userId } = useAuth();
  const a = useAction();
  const [options, setOptions] = useState(false);
  const subjects = useEntities("subject");
  const modules = useEntities("module");
  const existing = useEntities("course").find((c) => c.id === id);
  const { control, handleSubmit, watch, setValue, reset } = useForm<Values>({
    defaultValues: {
      title: "",
      description: "",
      subjectId: initialSubject ?? "",
      moduleId: initialModule ?? "",
      minutes: "10",
      importance: "2",
    },
  });
  useEffect(() => {
    if (existing)
      reset({
        title: String(existing.title),
        description: String(existing.description ?? ""),
        subjectId: String(existing.subjectId),
        moduleId: String(existing.moduleId ?? ""),
        minutes: String(existing.estimatedReviewMinutes),
        importance: String(existing.importance),
      });
  }, [existing, reset]);
  const subjectId = watch("subjectId");
  const moduleId = watch("moduleId");
  const field = (name: keyof Values, label: string, multiline = false) => (
    <Controller
      key={name}
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur } }) => (
        <Field
          label={label}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          multiline={multiline}
        />
      )}
    />
  );
  return (
    <Screen>
      <Label large>{id ? "Modifier le cours" : "Nouveau cours"}</Label>
      {field("title", "Nom du cours *")}
      <Label>Matière *</Label>
      {subjects.map((s) => (
        <Button
          key={s.id}
          secondary={subjectId !== s.id}
          title={String(s.title)}
          onPress={() => {
            setValue("subjectId", s.id);
            setValue("moduleId", "");
          }}
        />
      ))}
      <Label>Module (facultatif)</Label>
      <Button
        secondary={moduleId !== ""}
        title="Sans module"
        onPress={() => setValue("moduleId", "")}
      />
      {modules
        .filter((m) => m.subjectId === subjectId)
        .map((m) => (
          <Button
            key={m.id}
            secondary={moduleId !== m.id}
            title={String(m.title)}
            onPress={() => setValue("moduleId", m.id)}
          />
        ))}
      <Button
        secondary
        title={options ? "Masquer les options" : "Options"}
        onPress={() => setOptions(!options)}
      />
      {options && (
        <>
          {field("minutes", "Temps estimé de révision (minutes)")}
          {field("importance", "Importance (1 à 3)")}
          {field("description", "Description / notes", true)}
        </>
      )}
      <ErrorText message={a.error} />
      <Button
        title="Enregistrer"
        disabled={a.busy}
        onPress={() =>
          void handleSubmit((values) =>
            a.run(async () => {
              const input = courseInput.parse({
                title: values.title,
                description: values.description,
                subjectId: values.subjectId,
                moduleId: values.moduleId || null,
                estimatedReviewMinutes: Number(values.minutes),
                importance: Number(values.importance),
                archivedAt: existing?.archivedAt ?? null,
              });
              const courseId = await save("course", userId, input, id);
              router.replace(`/course/${courseId}`);
            }),
          )()
        }
      />
      <Button secondary title="Annuler" onPress={() => router.back()} />
    </Screen>
  );
}
