import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import {
  ArrowLeft01Icon,
  PlayIcon,
  PencilEdit01Icon,
  Archive01Icon,
  ArchiveRestoreIcon,
  Delete02Icon,
  Add01Icon,
  Calendar01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import {
  courseInput,
  studyItemInput,
  STUDY_METHOD_LABELS,
  type StudyItemType,
} from "@memocycle/contracts";
import {
  Screen,
  Card,
  Button,
  IconButton,
  Field,
  Pill,
  EmptyState,
  ErrorText,
  useAction,
  useEntities,
  confirm,
  SectionTitle,
  usePalette,
} from "../../src/ui/components";
import { AppIcon } from "../../src/ui/Icon";
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
    .sort((itemA, itemB) => itemB.completedAt.localeCompare(itemA.completedAt));

  const [showItemModal, setShowItemModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [itemType, setItemType] = useState<StudyItemType>("flashcard");
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [hintText, setHintText] = useState("");

  if (!raw) {
    return (
      <Screen>
        <IconButton
          icon={ArrowLeft01Icon}
          accessibilityLabel="Retour"
          onPress={() => router.back()}
        />
        <EmptyState
          title="Cours introuvable"
          description="Ce cours n'existe pas ou a été supprimé."
        />
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
      {/* Top Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton
          icon={ArrowLeft01Icon}
          accessibilityLabel="Retour"
          onPress={() => router.back()}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: c.textSecondary }} numberOfLines={1}>
            {String(subjects.find((s) => s.id === course.subjectId)?.title ?? "Sans matière")}
            {course.moduleId
              ? ` • ${modules.find((m) => m.id === course.moduleId)?.title ?? ""}`
              : ""}
          </Text>
          <Text
            style={{
              fontSize: 18,
              lineHeight: 22,
              fontWeight: "700",
              color: c.textPrimary,
              letterSpacing: -0.3,
            }}
            numberOfLines={1}
          >
            {course.title}
          </Text>
        </View>
      </View>

      {course.description ? (
        <Text style={{ fontSize: 14, color: c.textSecondary, lineHeight: 20 }}>
          {course.description}
        </Text>
      ) : null}

      {/* Memory Status & Actions Card */}
      <Card style={{ padding: 14, gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 13, color: c.textSecondary }}>
              Prochaine révision :
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.textPrimary }}>
              {plan?.nextReviewAt
                ? new Date(plan.nextReviewAt).getTime() < Date.now()
                  ? `En retard (${lateness(plan.nextReviewAt)})`
                  : displayDate(plan.nextReviewAt)
                : plan?.status === "completed"
                ? "Cycle terminé"
                : "Non programmé"}
            </Text>
          </View>
          {retentionPercent !== null && (
            <Pill tone={retentionPercent >= 90 ? "success" : "warning"}>
              {retentionPercent} %
            </Pill>
          )}
        </View>

        {/* Actions bar */}
        <View style={{ gap: 8 }}>
          {!course.archivedAt && (
            <Button
              fullWidth
              size="md"
              title={
                !plan
                  ? "J’ai étudié ce cours"
                  : plan.status === "active"
                  ? "Commencer la session"
                  : "Recommencer un cycle"
              }
              icon={PlayIcon}
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
          )}

          {plan?.status === "active" && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button
                size="sm"
                variant="secondary"
                title="Planifier"
                icon={Calendar01Icon}
                onPress={() => setShowPlanModal(true)}
                style={{ flex: 1 }}
              />
              <Button
                size="sm"
                variant="secondary"
                title="Réviser"
                icon={SparklesIcon}
                onPress={() => router.push(`/review/${id}?mode=voluntary`)}
                style={{ flex: 1 }}
              />
            </View>
          )}
        </View>
      </Card>

      {/* Méthodes utilisées */}
      {events.length > 0 && (
        <Card style={{ padding: 14, gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: c.textPrimary }}>
            Méthodes utilisées
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {(() => {
              const methodCounts: Record<string, number> = {};
              for (const ev of events) {
                const m = ev.studyMethod || (ev.confidence ? "cued_recall" : "free_recall");
                const label = STUDY_METHOD_LABELS[m as keyof typeof STUDY_METHOD_LABELS] || m;
                methodCounts[label] = (methodCounts[label] || 0) + 1;
              }
              return Object.entries(methodCounts).map(([label, count]) => (
                <Pill key={label} tone="neutral">
                  {label} · {count}
                </Pill>
              ));
            })()}
          </View>
        </Card>
      )}

      {/* Memory Curve */}
      {plan && <MemoryCurve plans={[plan]} now={Date.now()} />}

      {/* Learning Items */}
      <View style={{ gap: 8 }}>
        <SectionTitle
          title={`Fiches (${courseItems.length})`}
          action={
            <Button
              size="sm"
              variant="secondary"
              icon={Add01Icon}
              title="Fiche"
              onPress={() => handleOpenAddItem("flashcard")}
            />
          }
        />

        {courseItems.map((item) => (
          <Card key={item.id} style={{ padding: 12, gap: 6 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Pill tone="primary">
                {item.type === "flashcard"
                  ? "Flashcard"
                  : item.type === "question"
                  ? "Question"
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
                style={{ padding: 4 }}
              >
                <AppIcon icon={Delete02Icon} size={16} color={c.danger} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 14, fontWeight: "600", color: c.textPrimary }}>
              {item.front || item.back || "Contenu"}
            </Text>
            {item.back && item.type !== "note" && (
              <Text style={{ fontSize: 13, color: c.textSecondary }}>
                {item.back}
              </Text>
            )}
            {item.hint && (
              <Text style={{ fontSize: 12, color: c.warning, fontStyle: "italic" }}>
                Indice : {item.hint}
              </Text>
            )}
          </Card>
        ))}
      </View>

      {/* Associated Exams */}
      {associatedExams.length > 0 && (
        <View style={{ gap: 6 }}>
          <SectionTitle title="Examens associés" />
          {associatedExams.map((exam) => (
            <Card
              key={exam.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 12,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: c.textPrimary }}>
                {exam.title}
              </Text>
              <Text style={{ fontSize: 12, color: c.textSecondary }}>
                {displayDate(exam.examAt)}
              </Text>
            </Card>
          ))}
        </View>
      )}

      {/* History section: compact list with dividers */}
      {events.length > 0 && (
        <View style={{ gap: 6 }}>
          <SectionTitle title="Historique" />
          <Card style={{ padding: 12, gap: 8 }}>
            {events.map((e, idx) => (
              <View
                key={e.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 6,
                  borderTopWidth: idx > 0 ? 1 : 0,
                  borderTopColor: c.border,
                }}
              >
                <View style={{ gap: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: c.textPrimary }}>
                    {e.kind === "review_completed"
                      ? "Révision effectuée"
                      : e.kind === "initial_study"
                      ? "Étude initiale"
                      : "Cycle redémarré"}
                  </Text>
                  <Text style={{ fontSize: 11, color: c.textSecondary }}>
                    {displayDate(e.completedAt)}
                  </Text>
                </View>
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
            ))}
          </Card>
        </View>
      )}

      {/* Course management: compact actions at bottom */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 12,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: c.border,
        }}
      >
        <Button
          size="sm"
          variant="secondary"
          icon={PencilEdit01Icon}
          title="Modifier"
          onPress={() => router.push(`/course/edit/${id}`)}
        />
        <Button
          size="sm"
          variant="secondary"
          icon={course.archivedAt ? ArchiveRestoreIcon : Archive01Icon}
          title={course.archivedAt ? "Désarchiver" : "Archiver"}
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
          size="sm"
          variant="destructive"
          icon={Delete02Icon}
          title="Supprimer"
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

      {/* Modal for adding StudyItem */}
      <Modal
        visible={showItemModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowItemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <SectionTitle
              title={
                itemType === "flashcard"
                  ? "Nouvelle flashcard"
                  : itemType === "question"
                  ? "Nouvelle question"
                  : "Nouvelle note"
              }
            />

            <Field
              label={itemType === "question" ? "Question" : "Recto"}
              value={frontText}
              onChangeText={setFrontText}
              placeholder="Question ou concept"
              multiline
            />

            {itemType !== "note" && (
              <Field
                label="Verso (Réponse)"
                value={backText}
                onChangeText={setBackText}
                placeholder="Réponse attendue"
                multiline
              />
            )}

            <Field
              label="Indice (optionnel)"
              value={hintText}
              onChangeText={setHintText}
              placeholder="Indice"
            />

            <View style={{ gap: 8, marginTop: 4 }}>
              <Button
                fullWidth
                size="md"
                title="Enregistrer"
                onPress={() => void handleSaveItem()}
                disabled={a.busy}
              />
              <Button
                variant="ghost"
                title="Annuler"
                onPress={() => setShowItemModal(false)}
                style={{ alignSelf: "center" }}
              />
            </View>

            <ErrorText message={a.error} />
          </View>
        </View>
      </Modal>

      {/* Modal for Quick Planning */}
      <Modal
        visible={showPlanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <SectionTitle title="Planifier la prochaine révision" />
            <Text style={{ fontSize: 13, color: c.textSecondary }}>
              Choisir un créneau pour ce cours :
            </Text>

            <View style={{ gap: 8, marginTop: 6 }}>
              <Button
                fullWidth
                size="md"
                variant="secondary"
                title="Aujourd’hui (18:00)"
                onPress={() => {
                  if (plan) {
                    const d = new Date();
                    d.setHours(18, 0, 0, 0);
                    void a.run(async () => {
                      await save("reviewPlan", userId, { ...plan, nextReviewAt: d.toISOString() }, plan.id);
                      setShowPlanModal(false);
                    });
                  }
                }}
              />
              <Button
                fullWidth
                size="md"
                variant="secondary"
                title="Demain (18:00)"
                onPress={() => {
                  if (plan) {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    d.setHours(18, 0, 0, 0);
                    void a.run(async () => {
                      await save("reviewPlan", userId, { ...plan, nextReviewAt: d.toISOString() }, plan.id);
                      setShowPlanModal(false);
                    });
                  }
                }}
              />
              <Button
                fullWidth
                size="md"
                variant="secondary"
                title="Dans 3 jours"
                onPress={() => {
                  if (plan) {
                    const d = new Date();
                    d.setDate(d.getDate() + 3);
                    d.setHours(18, 0, 0, 0);
                    void a.run(async () => {
                      await save("reviewPlan", userId, { ...plan, nextReviewAt: d.toISOString() }, plan.id);
                      setShowPlanModal(false);
                    });
                  }
                }}
              />
              <Button
                fullWidth
                size="md"
                variant="secondary"
                title="Dans 1 semaine"
                onPress={() => {
                  if (plan) {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    d.setHours(18, 0, 0, 0);
                    void a.run(async () => {
                      await save("reviewPlan", userId, { ...plan, nextReviewAt: d.toISOString() }, plan.id);
                      setShowPlanModal(false);
                    });
                  }
                }}
              />
            </View>

            <Button
              variant="ghost"
              title="Fermer"
              onPress={() => setShowPlanModal(false)}
              style={{ alignSelf: "center", marginTop: 6 }}
            />
          </View>
        </View>
      </Modal>

      <ErrorText message={a.error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    maxHeight: "90%",
  },
});
