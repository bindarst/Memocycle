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
}: {
  kind: "subject" | "module" | "exam";
  subjectId?: string;
  moduleId?: string;
  entityId?: string;
}) {
  const c = usePalette();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
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
    setDate(
      existing?.examAt
        ? format(new Date(String(existing.examAt)), "yyyy-MM-dd HH:mm")
        : "",
    );
    setIconKey(String(existing?.iconKey ?? "book"));
    setColorKey(String(existing?.colorKey ?? "blue"));
    setOpen(true);
  };

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        icon={entityId ? PencilEdit01Icon : Add01Icon}
        title={entityId ? `Modifier ${name}` : `Ajouter ${name}`}
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
            <Field
              label="Date et heure (AAAA-MM-JJ HH:mm)"
              value={date}
              onChangeText={setDate}
              placeholder="2026-09-30 14:00"
            />
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
                          const timestamp = Date.parse(date.replace(" ", "T"));
                          if (!Number.isFinite(timestamp))
                            throw new Error(
                              "Entre une date valide au format AAAA-MM-JJ HH:mm.",
                            );
                          return examInput.parse({
                            title,
                            subjectId: resolvedSubjectId,
                            moduleId: resolvedModuleId,
                            notes: description,
                            examAt: new Date(timestamp).toISOString(),
                          });
                        })();
                  await save(kind, userId, input, entityId);
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

