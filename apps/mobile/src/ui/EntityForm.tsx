import { useState } from "react";
import { Modal, View } from "react-native";
import { format } from "date-fns";
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
} from "./components";

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
        : "une date d’examen";
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
        secondary
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
              <Label>Icône</Label>
              {[
                ["book", "Livre"],
                ["science", "Sciences"],
                ["language", "Langues"],
                ["math", "Mathématiques"],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  secondary={iconKey !== value}
                  title={label!}
                  onPress={() => setIconKey(value!)}
                />
              ))}
              <Label>Couleur d’accent</Label>
              {[
                ["blue", "Bleu"],
                ["green", "Vert"],
                ["amber", "Ambre"],
                ["slate", "Ardoise"],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  secondary={colorKey !== value}
                  title={label!}
                  onPress={() => setColorKey(value!)}
                />
              ))}
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
          <Button
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
          <Button secondary title="Annuler" onPress={() => setOpen(false)} />
          <View style={{ height: 24 }} />
        </Screen>
      </Modal>
    </>
  );
}
