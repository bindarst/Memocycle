import React, { useState } from "react";
import { Modal, View, Text, Pressable } from "react-native";
import { format } from "date-fns";
import {
  Book01Icon,
  FlaskConicalIcon,
  LanguagesIcon,
  Calculator01Icon,
  Tick01Icon,
  Add01Icon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import { subjectInput, moduleInput, examInput } from "@memocycle/contracts";
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
  usePalette,
} from "./components";
import { AppIcon } from "./Icon";
import { ExamDatePicker } from "./ExamDatePicker";
import { examTimestamp } from "../utils/examDate";

const ICONS = [
  { key: "book", label: "Livre", icon: Book01Icon },
  { key: "science", label: "Sciences", icon: FlaskConicalIcon },
  { key: "language", label: "Langues", icon: LanguagesIcon },
  { key: "math", label: "Maths", icon: Calculator01Icon },
];

const COLORS = [
  { key: "blue", label: "Bleu", color: "#3B82F6" },
  { key: "green", label: "Vert", color: "#10B981" },
  { key: "amber", label: "Ambre", color: "#F59E0B" },
  { key: "slate", label: "Ardoise", color: "#64748B" },
];

export function EntityForm({
  kind,
  subjectId,
  moduleId,
  entityId,
  onCreated,
  triggerTitle,
  triggerVariant = "secondary",
  triggerSize = "sm",
}: {
  kind: "subject" | "module" | "exam";
  subjectId?: string;
  moduleId?: string;
  entityId?: string;
  onCreated?: (id: string) => void;
  triggerTitle?: string;
  triggerVariant?: "primary" | "secondary" | "ghost" | "destructive";
  triggerSize?: "sm" | "md" | "lg";
}) {
  const c = usePalette();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [examDay, setExamDay] = useState(() => new Date());
  const [examTime, setExamTime] = useState("09:00");
  const [iconKey, setIconKey] = useState("book");
  const [colorKey, setColorKey] = useState("blue");
  const a = useAction();
  const { userId } = useAuth();
  const existing = useEntities(kind).find((entity) => entity.id === entityId);

  const name =
    kind === "subject"
      ? "une matière"
      : kind === "module"
      ? "un module"
      : "un examen";

  const openForm = () => {
    setTitle(String(existing?.title ?? ""));
    setDescription(
      String(
        (kind === "exam" ? existing?.notes : existing?.description) ?? "",
      ),
    );
    const initialExam = existing?.examAt
      ? new Date(String(existing.examAt))
      : new Date();
    if (!existing?.examAt) initialExam.setDate(initialExam.getDate() + 1);
    setExamDay(initialExam);
    setExamTime(existing?.examAt ? format(initialExam, "HH:mm") : "09:00");
    setIconKey(String(existing?.iconKey ?? "book"));
    setColorKey(String(existing?.colorKey ?? "blue"));
    setOpen(true);
  };

  const defaultButtonTitle = entityId ? `Modifier ${name}` : `Ajouter ${name}`;

  return (
    <>
      <Button
        size={triggerSize}
        variant={triggerVariant}
        icon={entityId ? PencilEdit01Icon : Add01Icon}
        title={triggerTitle ?? defaultButtonTitle}
        onPress={openForm}
      />
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <Screen>
          <Label large>
            {entityId ? "Modifier" : "Ajouter"} {name}
          </Label>

          <Field
            label="Nom"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <Field
            label={kind === "exam" ? "Notes" : "Description"}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={2000}
          />

          {kind === "subject" && (
            <>
              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: c.textSecondary,
                  }}
                >
                  Icône
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {ICONS.map(({ key, label, icon }) => {
                    const isSelected = iconKey === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setIconKey(key)}
                        accessibilityRole="button"
                        accessibilityLabel={label}
                        style={({ pressed }) => ({
                          flex: 1,
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          paddingVertical: 10,
                          borderRadius: 12,
                          backgroundColor: isSelected
                            ? c.primarySoft
                            : c.surface,
                          borderWidth: 1,
                          borderColor: isSelected ? c.primary : c.border,
                          opacity: pressed ? 0.75 : 1,
                        })}
                      >
                        <AppIcon
                          icon={icon}
                          size={20}
                          color={isSelected ? c.primary : c.textSecondary}
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: isSelected ? "700" : "500",
                            color: isSelected ? c.primary : c.textSecondary,
                          }}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: c.textSecondary,
                  }}
                >
                  Couleur d’accent
                </Text>
                <View style={{ flexDirection: "row", gap: 14 }}>
                  {COLORS.map(({ key, label, color }) => {
                    const isSelected = colorKey === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setColorKey(key)}
                        accessibilityRole="button"
                        accessibilityLabel={label}
                        style={({ pressed }) => ({
                          alignItems: "center",
                          gap: 4,
                          opacity: pressed ? 0.75 : 1,
                        })}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: color,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: isSelected ? 3 : 0,
                            borderColor: c.background,
                          }}
                        >
                          {isSelected && <AppIcon icon={Tick01Icon} size={16} color="#FFFFFF" />}
                        </View>
                        <Text
                          style={{
                            fontSize: 11,
                            color: isSelected ? c.textPrimary : c.textSecondary,
                            fontWeight: isSelected ? "700" : "500",
                          }}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          {kind === "exam" && (
            <ExamDatePicker value={examDay} onChange={setExamDay} time={examTime} onTimeChange={setExamTime} />
          )}

          <ErrorText message={a.error} />

          <View style={{ gap: 8, marginTop: 6 }}>
            <Button
              fullWidth
              size="lg"
              title={entityId ? "Enregistrer" : "Créer"}
              disabled={a.busy}
              onPress={() =>
                void a.run(async () => {
                  const resolvedSubjectId = String(
                    existing?.subjectId ?? subjectId ?? "",
                  );
                  if ((kind === "module" || kind === "exam") && !resolvedSubjectId) {
                    throw new Error("Choisis une matière.");
                  }
                  const resolvedModuleId =
                    existing?.moduleId === null
                      ? null
                      : String(existing?.moduleId ?? moduleId ?? "") || null;
                  const input =
                    kind === "subject"
                      ? subjectInput.parse({
                          title,
                          description,
                          iconKey,
                          colorKey,
                          position: existing?.position ?? 0,
                          archivedAt: existing?.archivedAt ?? null,
                        })
                      : kind === "module"
                      ? moduleInput.parse({
                          title,
                          description,
                          subjectId: resolvedSubjectId,
                          position: existing?.position ?? 0,
                          archivedAt: existing?.archivedAt ?? null,
                        })
                      : (() => {
                          return examInput.parse({
                            title,
                            subjectId: resolvedSubjectId,
                            moduleId: resolvedModuleId,
                            notes: description,
                            examAt: examTimestamp(examDay, examTime),
                          });
                        })();
                  const savedId = await save(kind, userId, input, entityId);
                  if (!entityId) {
                    onCreated?.(savedId);
                  }
                  setOpen(false);
                })
              }
            />
            <Button
              variant="ghost"
              title="Annuler"
              onPress={() => setOpen(false)}
              style={{ alignSelf: "center" }}
            />
          </View>
        </Screen>
      </Modal>
    </>
  );
}
