import React, { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { View, Text, StyleSheet, Pressable } from "react-native";
import {
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  HelpCircleIcon,
  ViewIcon,
  Layers01Icon,
  Cancel01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import {
  Screen,
  Label,
  Button,
  IconButton,
  Card,
  EmptyState,
  ErrorText,
  useAction,
  useEntities,
  usePalette,
  Pill,
  confirm,
} from "../../src/ui/components";
import { AppIcon } from "../../src/ui/Icon";
import { LocalPdfSection } from "../../src/ui/LocalPdfSection";
import {
  courseSchema,
  planSchema,
  studyItemSchema,
  type StudyItem,
} from "../../src/database/entities";
import { useAuth } from "../../src/auth/AuthProvider";
import { completeReview } from "../../src/review/reviewService";
import { newId } from "../../src/utils/ids";
import {
  STUDY_METHOD_LABELS,
  type ReviewRating,
  type StudyMethod,
} from "@memocycle/contracts";
import { recommendStudyMethod } from "../../src/review/methodRecommendationService";
import {
  formatSessionDuration,
  REVIEW_RATING_COPY,
  reviewSessionScore,
} from "../../src/review/reviewExperience";

export function calculateSessionRating(ratings: ReviewRating[]): ReviewRating {
  if (!ratings.length) return "good";
  const total = ratings.length;
  const againCount = ratings.filter((r) => r === "again").length;
  const hardCount = ratings.filter((r) => r === "hard").length;
  const easyCount = ratings.filter((r) => r === "easy").length;

  if (againCount / total >= 0.25) return "again";
  if (hardCount / total >= 0.5) return "hard";
  if (easyCount / total >= 0.7) return "easy";
  return "good";
}

export default function Review() {
  const { courseId, mode } = useLocalSearchParams<{ courseId: string; mode?: string }>();
  const { userId } = useAuth();
  const c = usePalette();
  const a = useAction();
  const mutation = useRef(newId());
  const locked = useRef(false);
  const startTimeRef = useRef(Date.now());

  const rawCourse = useEntities("course").find((item) => item.id === courseId);
  const rawPlan = useEntities("reviewPlan").find((p) => p.courseId === courseId);
  const subjects = useEntities("subject");
  const modules = useEntities("module");
  const allItems = useEntities("studyItem")
    .map((e) => studyItemSchema.parse(e))
    .filter((item) => item.courseId === courseId && !item.archivedAt && !item.deletedAt)
    .sort((x, y) => x.position - y.position);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [itemRatings, setItemRatings] = useState<Record<string, ReviewRating>>({});
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [done, setDone] = useState(false);
  const [globalRating, setGlobalRating] = useState<ReviewRating>("good");
  const [selectedMethod, setSelectedMethod] = useState<StudyMethod | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setElapsedSeconds(Math.max(0, Math.round((Date.now() - startTimeRef.current) / 1000))),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

  if (!rawCourse || !rawPlan) {
    return (
      <Screen>
        <IconButton
          icon={ArrowLeft01Icon}
          accessibilityLabel="Retour"
          onPress={() => router.back()}
        />
        <EmptyState
          title="Révision introuvable"
          description="Ce cours n’a pas de révision active ou est introuvable."
        />
      </Screen>
    );
  }

  const course = courseSchema.parse(rawCourse);
  const plan = planSchema.parse(rawPlan);
  const subject = subjects.find((s) => s.id === course.subjectId);
  const moduleItem = modules.find((m) => m.id === course.moduleId);

  const recommendation = recommendStudyMethod(course, plan);
  const activeMethod = selectedMethod ?? recommendation.method;

  const currentItem: StudyItem | undefined = allItems[currentIndex];
  const totalItems = allItems.length;

  const handleRateItem = (rating: ReviewRating) => {
    if (currentItem) {
      const nextRatings = { ...itemRatings, [currentItem.id]: rating };
      setItemRatings(nextRatings);
      if (currentIndex + 1 < totalItems) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
        setShowHint(false);
      } else {
        const computed = calculateSessionRating(Object.values(nextRatings));
        setGlobalRating(computed);
        setSessionCompleted(true);
      }
    } else {
      setGlobalRating(rating);
      setSessionCompleted(true);
    }
  };

  const handleCommitReview = (ratingToSubmit?: ReviewRating) => {
    if (locked.current) return;
    locked.current = true;
    const finalRating = ratingToSubmit ?? globalRating;
    const durationSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    void a.run(async () => {
      try {
        await completeReview(
          userId,
          courseId,
          "complete",
          mutation.current,
          {
            rating: finalRating,
            desiredRetention: plan.desiredRetention,
            durationSeconds,
            sessionType: mode === "voluntary" ? "voluntary_review" : "scheduled_review",
            studyMethod: activeMethod,
          },
        );
        setDone(true);
      } catch (e) {
        locked.current = false;
        throw e;
      }
    });
  };

  const renderRatingButtons = (onSelect: (rating: ReviewRating) => void, busy = false) => {
    const buttons: { rating: ReviewRating; tone: "again" | "hard" | "good" | "easy" }[] = [
      { rating: "again", tone: "again" },
      { rating: "hard", tone: "hard" },
      { rating: "good", tone: "good" },
      { rating: "easy", tone: "easy" },
    ];

    return (
      <View style={styles.ratingGrid}>
        {buttons.map(({ rating, tone }) => {
          const copy = REVIEW_RATING_COPY[rating];
          let bg = c.surfaceMuted;
          let border = c.border;
          let textColor = c.textPrimary;

          if (tone === "again") {
            bg = c.dangerSoft;
            border = c.danger;
            textColor = c.danger;
          } else if (tone === "hard") {
            bg = c.warningSoft;
            border = c.warning;
            textColor = c.warning;
          } else if (tone === "good") {
            bg = c.primarySoft;
            border = c.primary;
            textColor = c.primary;
          } else if (tone === "easy") {
            bg = c.successSoft;
            border = c.success;
            textColor = c.success;
          }

          return (
            <Pressable
              key={rating}
              accessibilityRole="button"
              accessibilityLabel={`Évaluation : ${copy.label}. ${copy.description}`}
              disabled={busy}
              onPress={() => onSelect(rating)}
              style={({ pressed }) => [
                styles.ratingButton,
                {
                  backgroundColor: bg,
                  borderColor: border,
                  opacity: busy ? 0.5 : pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.ratingLabel, { color: textColor }]}>{copy.label}</Text>
              <Text style={[styles.ratingDescription, { color: textColor }]}>
                {copy.description}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <IconButton
          icon={Cancel01Icon}
          accessibilityLabel="Fermer"
          onPress={() => router.back()}
        />
        <Pill tone="primary">
          {plan.schedulerType === "fsrs" ? "FSRS" : `${plan.currentStep}/6`}
        </Pill>
      </View>

      <View style={[styles.sessionStrip, { backgroundColor: c.surfaceMuted }]}>
        <View style={styles.sessionStripItem}>
          <AppIcon icon={Clock01Icon} size={14} color={c.primary} />
          <Text style={[styles.sessionStripValue, { color: c.textPrimary }]}>
            {formatSessionDuration(elapsedSeconds)}
          </Text>
        </View>
        <Text style={{ color: c.textSecondary, fontSize: 12 }}>
          {totalItems > 0
            ? `${Object.keys(itemRatings).length}/${totalItems} fiches évaluées`
            : "Auto-évaluation du cours"}
        </Text>
      </View>

      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 13, color: c.textSecondary }}>
          {String(subject?.title ?? "")}
          {moduleItem ? ` · ${moduleItem.title}` : ""}
        </Text>
        <Label large>{course.title}</Label>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary }}>
            Méthode :
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Méthode ${STUDY_METHOD_LABELS[activeMethod]}. Changer de méthode`}
            style={styles.methodPicker}
            onPress={() => {
              const allMethods: StudyMethod[] = [
                "free_recall",
                "cued_recall",
                "practice_problems",
                "active_reading",
                "self_explanation",
                "worked_example",
                "passive_reading",
              ];
              const nextIdx = (allMethods.indexOf(activeMethod) + 1) % allMethods.length;
              setSelectedMethod(allMethods[nextIdx]!);
            }}
          >
            <Pill tone="primary">
              {`${STUDY_METHOD_LABELS[activeMethod]}${activeMethod === recommendation.method ? " · Recommandé" : ""}`}
            </Pill>
          </Pressable>
        </View>
      </View>

      {done ? (
        <Card style={styles.resultCard}>
          <View style={[styles.resultIcon, { backgroundColor: c.successSoft }]}>
            <AppIcon icon={CheckmarkCircle01Icon} color={c.success} size={32} />
          </View>
          <Label large style={{ textAlign: "center" }}>
            Révision enregistrée
          </Label>
          <Button fullWidth size="lg" title="Terminer" onPress={() => router.back()} />
        </Card>
      ) : sessionCompleted ? (
        <Card style={{ gap: 14 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.textPrimary }}>
            Résumé de la session
          </Text>

          {totalItems > 0 && (
            <>
            <View style={[styles.scoreCard, { backgroundColor: c.primarySoft }]}>
              <Text style={{ color: c.primary, fontSize: 12, fontWeight: "700" }}>MAÎTRISE DE LA SESSION</Text>
              <Text style={{ color: c.primary, fontSize: 28, fontWeight: "800" }}>
                {reviewSessionScore(Object.values(itemRatings))}%
              </Text>
              <Text style={{ color: c.textSecondary, fontSize: 12 }}>
                {formatSessionDuration(elapsedSeconds)} · {totalItems} fiche{totalItems > 1 ? "s" : ""}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <Text style={[styles.breakdownVal, { color: c.danger }]}>
                  {Object.values(itemRatings).filter((r) => r === "again").length}
                </Text>
                <Text style={[styles.breakdownLabel, { color: c.textSecondary }]}>Oublié</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={[styles.breakdownVal, { color: c.warning }]}>
                  {Object.values(itemRatings).filter((r) => r === "hard").length}
                </Text>
                <Text style={[styles.breakdownLabel, { color: c.textSecondary }]}>Difficile</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={[styles.breakdownVal, { color: c.primary }]}>
                  {Object.values(itemRatings).filter((r) => r === "good").length}
                </Text>
                <Text style={[styles.breakdownLabel, { color: c.textSecondary }]}>Bien</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={[styles.breakdownVal, { color: c.success }]}>
                  {Object.values(itemRatings).filter((r) => r === "easy").length}
                </Text>
                <Text style={[styles.breakdownLabel, { color: c.textSecondary }]}>Facile</Text>
              </View>
            </View>
            </>
          )}

          <Button
            fullWidth
            size="lg"
            title="Valider"
            disabled={a.busy}
            onPress={() => {
              if (
                plan.nextReviewAt &&
                new Date(plan.nextReviewAt).getTime() - Date.now() > 12 * 3600000
              ) {
                confirm(
                  "Valider en avance ?",
                  "Cette révision était prévue plus tard.",
                  () => handleCommitReview(globalRating),
                );
              } else {
                handleCommitReview(globalRating);
              }
            }}
          />
        </Card>
      ) : totalItems > 0 && currentItem ? (
        <View style={{ gap: 12 }}>
          {/* Progression */}
          <View style={styles.progressHeader}>
            <Text style={[styles.progressCount, { color: c.textPrimary }]}>Fiche {currentIndex + 1} sur {totalItems}</Text>
            <Pill tone="primary">{currentItem.type}</Pill>
          </View>
          <View style={[styles.progressBar, { backgroundColor: c.border }]}>
            <View
              style={{
                height: 4,
                borderRadius: 4,
                backgroundColor: c.primary,
                width: `${((currentIndex + 1) / totalItems) * 100}%`,
              }}
            />
          </View>

          {/* Flashcard */}
          <Card style={styles.flashcard}>
            <View style={styles.cardHeader}>
              <AppIcon icon={Layers01Icon} color={c.primary} size={16} />
              <Text style={[styles.cardTypeLabel, { color: c.primary }]}>
                {currentItem.type === "question"
                  ? "QUESTION"
                  : currentItem.type === "cloze"
                  ? "TEXTE À TROUS"
                  : currentItem.type === "note"
                  ? "NOTE"
                  : "RECTO"}
              </Text>
            </View>

            <Text style={[styles.cardFrontText, { color: c.textPrimary }]}>
              {currentItem.front || currentItem.back || "Pas de contenu"}
            </Text>

            {currentItem.hint && !showHint && (
              <Button
                size="sm"
                variant="ghost"
                icon={HelpCircleIcon}
                title="Indice"
                onPress={() => setShowHint(true)}
              />
            )}

            {showHint && currentItem.hint && (
              <View style={[styles.hintBox, { backgroundColor: c.warningSoft }]}>
                <Text style={[styles.hintText, { color: c.textPrimary }]}>
                  {currentItem.hint}
                </Text>
              </View>
            )}

            {/* Answer */}
            {!showAnswer ? (
              <Button
                fullWidth
                size="md"
                icon={ViewIcon}
                title="Afficher la réponse"
                onPress={() => setShowAnswer(true)}
              />
            ) : (
              <View style={[styles.answerContainer, { borderTopColor: c.border }]}>
                <Text style={[styles.answerHeader, { color: c.success }]}>
                  RÉPONSE
                </Text>
                <Text style={[styles.answerText, { color: c.textPrimary }]}>
                  {currentItem.back || currentItem.front}
                </Text>
              </View>
            )}
          </Card>

          {/* Evaluation */}
          {showAnswer && <LocalPdfSection parentType="studyItem" parentId={currentItem.id} compact readOnly />}
          {showAnswer && (
            <View style={{ gap: 6, marginTop: 4 }}>
              <Text style={{ fontSize: 13, color: c.textSecondary }}>
                Quelle facilité as-tu eue à retrouver la réponse ?
              </Text>
              {renderRatingButtons(handleRateItem, a.busy)}
            </View>
          )}
        </View>
      ) : (
        /* Cas sans items */
        <Card style={{ gap: 12 }}>
          <Label large>Auto-évaluation</Label>
          <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 20 }}>
            Sans fiche pour ce cours, évalue ce que tu peux retrouver de mémoire.
          </Text>
          {renderRatingButtons((rating) => {
            setGlobalRating(rating);
            if (
              plan.nextReviewAt &&
              new Date(plan.nextReviewAt).getTime() - Date.now() > 12 * 3600000
            ) {
              confirm(
                "Valider en avance ?",
                "Cette révision était prévue plus tard.",
                () => handleCommitReview(rating),
              );
            } else {
              handleCommitReview(rating);
            }
          }, a.busy)}
        </Card>
      )}

      <ErrorText message={a.error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressCount: { fontSize: 13, fontWeight: "600" },
  methodPicker: { minHeight: 44, justifyContent: "center" },
  progressBar: { height: 4, borderRadius: 4, overflow: "hidden" },
  flashcard: { minHeight: 180, gap: 12, padding: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTypeLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  cardFrontText: { fontSize: 17, lineHeight: 22, fontWeight: "600" },
  hintBox: { padding: 10, borderRadius: 8 },
  hintText: { fontSize: 13, lineHeight: 18 },
  answerContainer: { paddingTop: 12, borderTopWidth: 1, gap: 6 },
  answerHeader: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  answerText: { fontSize: 15, lineHeight: 20, fontWeight: "600" },
  ratingGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ratingButton: {
    width: "48.5%",
    minHeight: 68,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  ratingLabel: { fontSize: 14, fontWeight: "700" },
  ratingDescription: { fontSize: 10, lineHeight: 14, textAlign: "center", opacity: 0.85 },
  sessionStrip: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  sessionStripItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  sessionStripValue: { fontSize: 12, fontWeight: "700" },
  scoreCard: { alignItems: "center", gap: 2, borderRadius: 12, paddingVertical: 12 },
  resultCard: { alignItems: "center", padding: 24, gap: 12 },
  resultIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 6,
  },
  breakdownItem: { alignItems: "center", gap: 2 },
  breakdownVal: { fontSize: 18, fontWeight: "700" },
  breakdownLabel: { fontSize: 11, fontWeight: "500" },
});
