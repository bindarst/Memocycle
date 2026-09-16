import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { router } from "expo-router";
import { View, Text, Pressable, ScrollView } from "react-native";
import { ChevronDownIcon, ChevronUpIcon } from "@hugeicons/core-free-icons";
import {
  courseInput,
  CONTENT_TYPE_LABELS,
  PRIOR_KNOWLEDGE_LABELS,
  type ContentType,
  type PriorKnowledge,
  type StudyMethod,
} from "@memocycle/contracts";
import { useAuth } from "../auth/AuthProvider";
import { save } from "../database/repository";
import {
  Screen,
  Label,
  Field,
  Button,
  SegmentedControl,
  ErrorText,
  useAction,
  useEntities,
  usePalette,
} from "./components";
import { AppIcon } from "./Icon";
import type { Exam } from "../database/entities";

type Values = {
  title: string;
  description: string;
  subjectId: string;
  moduleId: string;
  minutes: string;
  importance: string;
  contentType: ContentType;
  priorKnowledge: PriorKnowledge;
  preferredStudyMethod: string;
  priority: string;
  tags: string;
  weeklyMinutes: string;
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
  const c = usePalette();
  const { userId } = useAuth();
  const a = useAction();
  const [showOptions, setShowOptions] = useState(false);
  const subjects = useEntities("subject");
  const modules = useEntities("module");
  const allExams = useEntities("exam") as Exam[];
  const existing = useEntities("course").find((item) => item.id === id);

  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);

  const { control, handleSubmit, watch, setValue, reset } = useForm<Values>({
    defaultValues: {
      title: "",
      description: "",
      subjectId: initialSubject ?? "",
      moduleId: initialModule ?? "",
      minutes: "10",
      importance: "2",
      contentType: "mixed",
      priorKnowledge: "none",
      preferredStudyMethod: "automatic",
      priority: "2",
      tags: "",
      weeklyMinutes: "",
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        title: String(existing.title),
        description: String(existing.description ?? ""),
        subjectId: String(existing.subjectId),
        moduleId: String(existing.moduleId ?? ""),
        minutes: String(existing.estimatedReviewMinutes ?? "10"),
        importance: String(existing.importance ?? "2"),
        contentType: (existing.contentType as ContentType) ?? "mixed",
        priorKnowledge: (existing.priorKnowledge as PriorKnowledge) ?? "none",
        preferredStudyMethod: typeof existing.preferredStudyMethod === "string" ? existing.preferredStudyMethod : "automatic",
        priority: String(existing.priority ?? "2"),
        tags: Array.isArray(existing.tags) ? (existing.tags as string[]).join(", ") : "",
        weeklyMinutes: existing.weeklyStudyTargetMinutes ? String(existing.weeklyStudyTargetMinutes) : "",
      });
      if (Array.isArray(existing.examIds)) {
        setSelectedExamIds(existing.examIds as string[]);
      }
    }
  }, [existing, reset]);

  const subjectId = watch("subjectId");
  const moduleId = watch("moduleId");
  const filteredModules = modules.filter((m) => m.subjectId === subjectId);

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

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSecondary }}>
          Matière *
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
        >
          {subjects.map((s) => {
            const isSelected = subjectId === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  setValue("subjectId", s.id);
                  setValue("moduleId", "");
                }}
                accessibilityRole="button"
                accessibilityLabel={String(s.title)}
                style={({ pressed }) => ({
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: isSelected ? c.primary : c.surface,
                  borderWidth: 1,
                  borderColor: isSelected ? c.primary : c.border,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isSelected ? "700" : "500",
                    color: isSelected ? c.onPrimary : c.textPrimary,
                  }}
                >
                  {String(s.title)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {subjectId && filteredModules.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text
            style={{ fontSize: 13, fontWeight: "600", color: c.textSecondary }}
          >
            Module (facultatif)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            <Pressable
              onPress={() => setValue("moduleId", "")}
              accessibilityRole="button"
              accessibilityLabel="Sans module"
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: moduleId === "" ? c.primary : c.surface,
                borderWidth: 1,
                borderColor: moduleId === "" ? c.primary : c.border,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: moduleId === "" ? "700" : "500",
                  color: moduleId === "" ? c.onPrimary : c.textPrimary,
                }}
              >
                Sans module
              </Text>
            </Pressable>
            {filteredModules.map((m) => {
              const isSelected = moduleId === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setValue("moduleId", m.id)}
                  accessibilityRole="button"
                  accessibilityLabel={String(m.title)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: isSelected ? c.primary : c.surface,
                    borderWidth: 1,
                    borderColor: isSelected ? c.primary : c.border,
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: isSelected ? "700" : "500",
                      color: isSelected ? c.onPrimary : c.textPrimary,
                    }}
                  >
                    {String(m.title)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <Pressable
        onPress={() => setShowOptions(!showOptions)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 6,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color: c.primary }}>
          Options avancées
        </Text>
        <AppIcon
          icon={showOptions ? ChevronUpIcon : ChevronDownIcon}
          size={16}
          color={c.primary}
        />
      </Pressable>

      {showOptions && (
        <View style={{ gap: 14 }}>
          {field("minutes", "Temps estimé de révision (minutes)")}
          {field("description", "Description / notes", true)}

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSecondary }}>
              Type de contenu
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(["facts", "concepts", "procedures", "problem_solving", "mixed"] as ContentType[]).map((type) => {
                const isSelected = watch("contentType") === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setValue("contentType", type)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: isSelected ? c.primary : c.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? c.primary : c.border,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600", color: isSelected ? c.onPrimary : c.textPrimary }}>
                      {CONTENT_TYPE_LABELS[type]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSecondary }}>
              Connaissances préalables
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(["none", "basic", "familiar", "strong"] as PriorKnowledge[]).map((level) => {
                const isSelected = watch("priorKnowledge") === level;
                return (
                  <Pressable
                    key={level}
                    onPress={() => setValue("priorKnowledge", level)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: isSelected ? c.primary : c.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? c.primary : c.border,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600", color: isSelected ? c.onPrimary : c.textPrimary }}>
                      {PRIOR_KNOWLEDGE_LABELS[level]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSecondary }}>
              Priorité
            </Text>
            <SegmentedControl
              options={[
                { label: "Haute", value: "1" },
                { label: "Normale", value: "2" },
                { label: "Basse", value: "3" },
              ]}
              value={watch("priority")}
              onChange={(val) => setValue("priority", val)}
            />
          </View>

          {allExams.filter((e) => e.subjectId === subjectId).length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSecondary }}>
                Examens associés
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {allExams
                  .filter((e) => e.subjectId === subjectId)
                  .map((ex) => {
                    const isSelected = selectedExamIds.includes(ex.id);
                    return (
                      <Pressable
                        key={ex.id}
                        onPress={() => {
                          setSelectedExamIds((prev) =>
                            isSelected ? prev.filter((item) => item !== ex.id) : [...prev, ex.id],
                          );
                        }}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: isSelected ? c.primarySoft : c.surface,
                          borderWidth: 1,
                          borderColor: isSelected ? c.primary : c.border,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "600", color: isSelected ? c.primary : c.textPrimary }}>
                          {ex.title}
                        </Text>
                      </Pressable>
                    );
                  })}
              </View>
            </View>
          )}

          {field("tags", "Tags (séparés par des virgules)")}
          {field("weeklyMinutes", "Objectif hebdomadaire (minutes)")}
        </View>
      )}

      <ErrorText message={a.error} />

      <View style={{ gap: 8, marginTop: 4 }}>
        <Button
          fullWidth
          size="lg"
          title="Enregistrer"
          disabled={a.busy}
          onPress={() =>
            void handleSubmit((values) =>
              a.run(async () => {
                const priorityNum = Number(values.priority);
                const input = courseInput.parse({
                  title: values.title,
                  description: values.description || null,
                  subjectId: values.subjectId,
                  moduleId: values.moduleId || null,
                  estimatedReviewMinutes: Number(values.minutes),
                  importance: Number(values.importance),
                  contentType: values.contentType,
                  priorKnowledge: values.priorKnowledge,
                  preferredStudyMethod:
                    values.preferredStudyMethod === "automatic"
                      ? null
                      : (values.preferredStudyMethod as StudyMethod),
                  methodSelectionMode:
                    values.preferredStudyMethod === "automatic" ? "automatic" : "manual",
                  priority: (priorityNum === 1 || priorityNum === 2 || priorityNum === 3 ? priorityNum : 2),
                  examIds: selectedExamIds,
                  tags: values.tags
                    ? values.tags.split(",").map((s) => s.trim()).filter(Boolean)
                    : [],
                  weeklyStudyTargetMinutes: values.weeklyMinutes ? Number(values.weeklyMinutes) : null,
                  targetDate: existing?.targetDate ?? null,
                  archivedAt: existing?.archivedAt ?? null,
                });
                const courseId = await save("course", userId, input, id);
                router.replace(`/course/${courseId}`);
              }),
            )()
          }
        />
        <Button
          variant="ghost"
          title="Annuler"
          onPress={() => router.back()}
          style={{ alignSelf: "center" }}
        />
      </View>
    </Screen>
  );
}
