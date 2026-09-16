import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import {
  Play,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react-native";
import { courseInput, studyItemInput, type StudyItemType } from "@memocycle/contracts";
import {
  Screen,
  Label,
  Card,
  Button,
  Field,
  Pill,
  ErrorText,
  useAction,
  useEntities,
  confirm,
  SectionTitle,
  usePalette,
} from "../../src/ui/components";
import {
  courseSchema,
  planSchema,
  eventSchema,
  type Course,
  type Plan,
  type Exam,
  type StudyItem,
} from "../../src/database/entities";
import { useAuth } from "../../src/auth/AuthProvider";
import { save, remove } from "../../src/database/repository";
import { completeReview } from "../../src/review/reviewService";
import { newId } from "../../src/utils/ids";
import { displayDate, lateness } from "../../src/utils/dates";
import { estimatePlanRetention } from "../../src/review/fsrsScheduler";
import { radius } from "../../src/theme/tokens";
import { MemoryCurve } from "../../src/ui/MemoryCurve";

export default function CourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const a = useAction();
  const c = usePalette();

  const raw = useEntities("course").find((item) => item.id === id);
  const planRaw = useEntities("reviewPlan").find((p) => p.courseId === id);
  const subjects = useEntities("subject");
  const modules = useEntities("module");
  const allItems = useEntities("studyItem") as StudyItem[];
  const allExams = useEntities("exam") as Exam[];

  const events = useEntities("reviewEvent")
    .map((e) => eventSchema.parse(e))
    .filter((e) => e.courseId === id)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  // Modal for adding StudyItem
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemType, setItemType] = useState<StudyItemType>("flashcard");
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [hintText, setHintText] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!raw) {
    return (
      <Screen>
        <Label>Cours introuvable</Label>
        <Button title="Retour" onPress={() => router.back()} />
      </Screen>
    );
  }

  const course = courseSchema.parse(raw) as Course;
  const plan = planRaw ? (planSchema.parse(planRaw) as Plan) : null;
  const courseItems = allItems.filter(
    (it) => it.courseId === id && !it.archivedAt,
  );
  const associatedExams = allExams.filter(
    (e) => e.subjectId === course.subjectId,
  );

  const retentionPercent = plan
    ? Math.round(estimatePlanRetention(plan, Date.now()) * 100)
    : null;

  const handleOpenAddItem = (type: StudyItemType) => {
    setItemType(type);
    setFrontText("");
    setBackText("");
    setHintText("");
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    await a.run(async () => {
      const parsed = studyItemInput.parse({
        courseId: id,
        type: itemType,
        front: frontText.trim() || null,
        back: backText.trim() || null,
        hint: hintText.trim() || null,
        position: courseItems.length,
        archivedAt: null,
      });

      await save("studyItem", userId, parsed, newId());
      setShowItemModal(false);
    });
  };

  return (
    <Screen>
      {/* Top bar & navigation */}
      <Button secondary title="Retour" onPress={() => router.back()} />

      <View style={{ gap: 4 }}>
        <Label muted>
          {String(subjects.find((s) => s.id === course.subjectId)?.title ?? "Sans matière")}
          {course.moduleId
            ? ` • ${modules.find((m) => m.id === course.moduleId)?.title ?? ""}`
            : ""}
        </Label>
        <Label large>{course.title}</Label>
        {course.description && (
          <Text style={{ fontSize: 15, color: c.textSecondary, lineHeight: 22 }}>
            {course.description}
          </Text>
        )}
      </View>

      {/* Meta indicators: Importance, estimated time, items */}
      <View style={styles.metaRow}>
        <View style={[styles.metaChip, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
          <Text style={[styles.metaLabel, { color: c.textSecondary }]}>Importance</Text>
          <Text style={[styles.metaValue, { color: c.textPrimary }]}>
            {"★".repeat(course.importance || 2)}
          </Text>
        </View>

        <View style={[styles.metaChip, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
          <Text style={[styles.metaLabel, { color: c.textSecondary }]}>Temps révision</Text>
          <Text style={[styles.metaValue, { color: c.textPrimary }]}>
            ~{course.estimatedReviewMinutes || 10} min
          </Text>
        </View>

        <View style={[styles.metaChip, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
          <Text style={[styles.metaLabel, { color: c.textSecondary }]}>Contenus</Text>
          <Text style={[styles.metaValue, { color: c.textPrimary }]}>
            {courseItems.length} fiche{courseItems.length > 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Memory Status & Next Review */}
      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: c.primary, textTransform: "uppercase", letterSpacing: 1.2 }}>
              État de mémorisation
            </Text>
            <Text style={{ fontSize: 20, fontWeight: "800", color: c.textPrimary }}>
              {retentionPercent !== null
                ? `Mémoire estimée : ${retentionPercent} %`
                : "Pas encore étudié"}
            </Text>
          </View>
          {retentionPercent !== null && (
            <Pill tone={retentionPercent >= 90 ? "success" : "warning"}>
              {retentionPercent >= 90 ? "Solide" : "À réviser"}
            </Pill>
          )}
        </View>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 14, color: c.textSecondary }}>
            Prochaine révision recommandée :
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.textPrimary }}>
            {plan?.nextReviewAt
              ? new Date(plan.nextReviewAt).getTime() < Date.now()
                ? `En retard (${lateness(plan.nextReviewAt)})`
                : displayDate(plan.nextReviewAt)
              : plan?.status === "completed"
                ? "Cycle terminé"
                : "Aucune révision programmée"}
          </Text>
        </View>

        {/* Action Button: Session */}
        {!course.archivedAt && (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
            <View style={{ flex: 1 }}>
              <Button
                title={!plan ? "J’ai étudié ce cours" : "Commencer une session"}
                icon={Play}
                onPress={() => {
                  if (plan?.status === "active") {
                    router.push(`/session/${id}`);
                  } else {
                    void a.run(() =>
                      completeReview(userId, id, plan ? "restart" : "start", newId()),
                    );
                  }
                }}
              />
            </View>
            {plan?.status === "active" && (
              <View style={{ flex: 1 }}>
                <Button
                  secondary
                  title="Rappel actif direct"
                  onPress={() => router.push(`/review/${id}`)}
                />
              </View>
            )}
          </View>
        )}

        {/* Advanced metrics accordion */}
        {plan && (
          <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 }}>
            <Pressable
              onPress={() => setShowAdvanced(!showAdvanced)}
              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSecondary }}>
                Paramètres avancés du moteur
              </Text>
              {showAdvanced ? (
                <ChevronUp size={16} color={c.textSecondary} />
              ) : (
                <ChevronDown size={16} color={c.textSecondary} />
              )}
            </Pressable>

            {showAdvanced && (
              <View style={{ gap: 6, marginTop: 10 }}>
                <Text style={{ fontSize: 13, color: c.textSecondary }}>
                  Moteur : {plan.schedulerType === "fsrs" ? "FSRS adaptatif" : "Cycle classique (6 étapes)"}
                </Text>
                {plan.difficulty !== null && plan.difficulty !== undefined && (
                  <Text style={{ fontSize: 13, color: c.textSecondary }}>
                    Difficulté estimée : {plan.difficulty.toFixed(1)} / 10
                  </Text>
                )}
                {plan.stability !== null && plan.stability !== undefined && (
                  <Text style={{ fontSize: 13, color: c.textSecondary }}>
                    Stabilité mémoire : {plan.stability.toFixed(1)} jours
                  </Text>
                )}
                <Text style={{ fontSize: 13, color: c.textSecondary }}>
                  Répétitions réussies : {plan.reps ?? plan.currentStep} • Oublis : {plan.lapses ?? 0}
                </Text>
                {plan.lastRating && (
                  <Text style={{ fontSize: 13, color: c.textSecondary }}>
                    Dernière auto-évaluation : {plan.lastRating}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </Card>

      {/* Memory Curve for this course */}
      {plan && <MemoryCurve plans={[plan]} now={Date.now()} />}

      {/* Learning Units (StudyItems) */}
      <View style={{ gap: 12 }}>
        <SectionTitle
          eyebrow="Contenus d'apprentissage"
          title={`Fiches & questions (${courseItems.length})`}
        />

        {courseItems.map((item) => (
          <Card key={item.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Pill tone="primary">
                {item.type === "flashcard"
                  ? "Flashcard"
                  : item.type === "question"
                    ? "Question"
                    : item.type === "cloze"
                      ? "Texte à trous"
                      : "Note"}
              </Pill>
              <Pressable
                onPress={() =>
                  confirm(
                    "Supprimer cette fiche ?",
                    "Cette action supprimera l'élément du cours.",
                    () => void a.run(() => remove("studyItem", item.id, userId)),
                  )
                }
              >
                <Trash2 size={16} color={c.danger} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 16, fontWeight: "700", color: c.textPrimary }}>
              {item.front || item.back || "Contenu"}
            </Text>
            {item.back && item.type !== "note" && (
              <Text style={{ fontSize: 14, color: c.textSecondary }}>
                Réponse : {item.back}
              </Text>
            )}
            {item.hint && (
              <Text style={{ fontSize: 13, color: c.warning, fontStyle: "italic" }}>
                Indice : {item.hint}
              </Text>
            )}
          </Card>
        ))}

        {/* Action Buttons to Add Items */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              secondary
              title="+ Fiche"
              onPress={() => handleOpenAddItem("flashcard")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              secondary
              title="+ Question"
              onPress={() => handleOpenAddItem("question")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              secondary
              title="+ Note"
              onPress={() => handleOpenAddItem("note")}
            />
          </View>
        </View>
      </View>

      {/* Associated Exams */}
      {associatedExams.length > 0 && (
        <View style={{ gap: 10 }}>
          <SectionTitle eyebrow="Examens" title="Échéances associées" />
          {associatedExams.map((exam) => (
            <Card key={exam.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <GraduationCap size={24} color={c.warning} />
              <View style={{ flex: 1, gap: 2 }}>
                <Label style={{ fontWeight: "700" }}>{exam.title}</Label>
                <Label muted style={{ fontSize: 13 }}>{displayDate(exam.examAt)}</Label>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Course management buttons */}
      <View style={{ gap: 10, marginTop: 10 }}>
        <Button
          secondary
          title="Modifier le cours"
          onPress={() => router.push(`/course/edit/${id}`)}
        />
        <Button
          secondary
          title={course.archivedAt ? "Désarchiver" : "Archiver le cours"}
          onPress={() =>
            void a.run(async () => {
              const input = courseInput.parse(
                Object.fromEntries(
                  Object.keys(courseInput.shape).map((k) => [
                    k,
                    course[k as keyof typeof course],
                  ]),
                ),
              );
              await save(
                "course",
                userId,
                {
                  ...input,
                  archivedAt: course.archivedAt ? null : new Date().toISOString(),
                },
                id,
              );
            })
          }
        />
        <Button
          danger
          title="Supprimer ce cours"
          onPress={() =>
            confirm(
              "Supprimer ce cours ?",
              "Son planning, ses fiches et son historique seront également supprimés.",
              () =>
                void a.run(async () => {
                  await remove("course", id, userId);
                  router.back();
                }),
            )
          }
        />
      </View>

      {/* History section */}
      <SectionTitle eyebrow="Historique" title="Sessions et révisions passées" />
      {events.length > 0 ? (
        events.map((e) => (
          <Card key={e.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Label style={{ fontWeight: "700" }}>
                {e.kind === "review_completed"
                  ? `Révision terminée`
                  : e.kind === "initial_study"
                    ? "Étude initiale"
                    : "Cycle redémarré"}
              </Label>
              {e.confidence && (
                <Pill
                  tone={
                    e.confidence === "easy" || e.confidence === "good"
                      ? "success"
                      : "warning"
                  }
                >
                  {e.confidence === "again"
                    ? "Oublié"
                    : e.confidence === "hard"
                      ? "Difficile"
                      : e.confidence === "good"
                        ? "Bien"
                        : "Facile"}
                </Pill>
              )}
            </View>
            <Label muted style={{ fontSize: 13 }}>
              {displayDate(e.completedAt)}
            </Label>
          </Card>
        ))
      ) : (
        <Card>
          <Label muted>Aucune révision enregistrée pour l'instant.</Label>
        </Card>
      )}

      {/* Modal for adding StudyItem */}
      <Modal
        visible={showItemModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowItemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.surface, borderColor: c.border }]}>
            <SectionTitle
              eyebrow="Nouvel élément"
              title={
                itemType === "flashcard"
                  ? "Créer une flashcard"
                  : itemType === "question"
                    ? "Créer une question"
                    : "Ajouter une note"
              }
            />

            <Field
              label={itemType === "question" ? "Question" : "Face avant (Recto)"}
              value={frontText}
              onChangeText={setFrontText}
              placeholder={
                itemType === "question"
                  ? "Quelle est la formule de..."
                  : "Mot-clé, concept ou énoncé"
              }
              multiline
            />

            {itemType !== "note" && (
              <Field
                label="Face arrière (Réponse)"
                value={backText}
                onChangeText={setBackText}
                placeholder="Réponse ou définition attendue"
                multiline
              />
            )}

            <Field
              label="Indice (optionnel)"
              value={hintText}
              onChangeText={setHintText}
              placeholder="Indice d'activation mnémotechnique"
            />

            <View style={{ gap: 8, marginTop: 8 }}>
              <Button
                title="Enregistrer la fiche"
                onPress={() => void handleSaveItem()}
                disabled={a.busy}
              />
              <Button
                secondary
                title="Annuler"
                onPress={() => setShowItemModal(false)}
              />
            </View>

            <ErrorText message={a.error} />
          </View>
        </View>
      </Modal>

      <ErrorText message={a.error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: "row",
    gap: 8,
  },
  metaChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.card,
    borderWidth: 1,
    alignItems: "center",
    gap: 3,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 22,
    gap: 14,
    maxHeight: "90%",
  },
});
