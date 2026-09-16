import { useRef, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { View, Text, StyleSheet, Pressable } from "react-native";
import {
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Eye,
  Layers,
} from "lucide-react-native";
import {
  Screen,
  Label,
  Button,
  Card,
  ErrorText,
  useAction,
  useEntities,
  usePalette,
  Pill,
  confirm,
} from "../../src/ui/components";
import {
  courseSchema,
  planSchema,
  studyItemSchema,
  type StudyItem,
} from "../../src/database/entities";
import { useAuth } from "../../src/auth/AuthProvider";
import { completeReview } from "../../src/review/reviewService";
import { newId } from "../../src/utils/ids";
import type { ReviewRating } from "@memocycle/contracts";

export function calculateSessionRating(ratings: ReviewRating[]): ReviewRating {
  if (!ratings.length) return "good";
  const total = ratings.length;
  const againCount = ratings.filter((r) => r === "again").length;
  const hardCount = ratings.filter((r) => r === "hard").length;
  const easyCount = ratings.filter((r) => r === "easy").length;

  // Règle conservatrice imposée :
  // 1. Si au moins 25% des éléments sont "again" -> "again"
  if (againCount / total >= 0.25) return "again";
  // 2. Sinon si la majorité est "hard" -> "hard"
  if (hardCount / total >= 0.5) return "hard";
  // 3. Sinon si au moins 70% sont "easy" -> "easy"
  if (easyCount / total >= 0.7) return "easy";
  // 4. Sinon -> "good"
  return "good";
}

export default function Review() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { userId } = useAuth();
  const c = usePalette();
  const a = useAction();
  const mutation = useRef(newId());
  const locked = useRef(false);

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

  if (!rawCourse || !rawPlan) {
    return (
      <Screen>
        <Label>Ce cours n’a pas de révision active.</Label>
        <Button title="Retour" onPress={() => router.back()} />
      </Screen>
    );
  }

  const course = courseSchema.parse(rawCourse);
  const plan = planSchema.parse(rawPlan);
  const subject = subjects.find((s) => s.id === course.subjectId);
  const moduleItem = modules.find((m) => m.id === course.moduleId);

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
    void a.run(async () => {
      try {
        await completeReview(
          userId,
          courseId,
          "complete",
          mutation.current,
          finalRating,
          plan.desiredRetention,
        );
        setDone(true);
      } catch (e) {
        locked.current = false;
        throw e;
      }
    });
  };

  const renderRatingButtons = (onSelect: (rating: ReviewRating) => void, busy = false) => {
    const buttons: { label: string; rating: ReviewRating; tone: "again" | "hard" | "good" | "easy" }[] = [
      { label: "Oublié", rating: "again", tone: "again" },
      { label: "Difficile", rating: "hard", tone: "hard" },
      { label: "Bien", rating: "good", tone: "good" },
      { label: "Facile", rating: "easy", tone: "easy" },
    ];

    return (
      <View style={styles.ratingGrid}>
        {buttons.map(({ label, rating, tone }) => {
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
              accessibilityLabel={`Évaluation : ${label}`}
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
              <Text style={[styles.ratingLabel, { color: textColor }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Button secondary title="Fermer" onPress={() => router.back()} />
        <Pill tone="primary">
          {plan.schedulerType === "fsrs" ? "Moteur adaptatif FSRS" : `Étape ${plan.currentStep}/6`}
        </Pill>
      </View>

      <View style={{ gap: 4 }}>
        <Label muted>
          {String(subject?.title ?? "")}
          {moduleItem ? ` · ${moduleItem.title}` : ""}
        </Label>
        <Label large>{course.title}</Label>
      </View>

      {done ? (
        <Card style={styles.resultCard}>
          <View style={[styles.resultIcon, { backgroundColor: c.successSoft }]}>
            <CheckCircle2 color={c.success} size={36} />
          </View>
          <Label large style={{ textAlign: "center" }}>
            ✓ Révision enregistrée
          </Label>
          <Label muted style={{ textAlign: "center" }}>
            Ton état de mémoire et la prochaine date de rappel ont été ajustés automatiquement.
          </Label>
          <Button title="Terminer" onPress={() => router.back()} />
        </Card>
      ) : sessionCompleted ? (
        <Card style={{ gap: 16 }}>
          <View style={styles.summaryHeader}>
            <Sparkles color={c.primary} size={24} />
            <Text style={[styles.summaryTitle, { color: c.textPrimary }]}>
              Résumé de la session
            </Text>
          </View>

          {totalItems > 0 && (
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <Text style={[styles.breakdownVal, { color: c.danger }]}>
                  {Object.values(itemRatings).filter((r) => r === "again").length}
                </Text>
                <Text style={[styles.breakdownLabel, { color: c.textSecondary }]}>Oubliés</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={[styles.breakdownVal, { color: c.warning }]}>
                  {Object.values(itemRatings).filter((r) => r === "hard").length}
                </Text>
                <Text style={[styles.breakdownLabel, { color: c.textSecondary }]}>Difficiles</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={[styles.breakdownVal, { color: c.primary }]}>
                  {Object.values(itemRatings).filter((r) => r === "good").length}
                </Text>
                <Text style={[styles.breakdownLabel, { color: c.textSecondary }]}>Biens</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={[styles.breakdownVal, { color: c.success }]}>
                  {Object.values(itemRatings).filter((r) => r === "easy").length}
                </Text>
                <Text style={[styles.breakdownLabel, { color: c.textSecondary }]}>Faciles</Text>
              </View>
            </View>
          )}

          <View style={[styles.assessmentBanner, { backgroundColor: c.surfaceMuted }]}>
            <Text style={[styles.assessmentKicker, { color: c.textSecondary }]}>
              Évaluation globale calculée :
            </Text>
            <Text style={[styles.assessmentValue, { color: c.primary }]}>
              {globalRating === "again"
                ? "Oublié (répétition rapprochée)"
                : globalRating === "hard"
                  ? "Difficile (renforcement)"
                  : globalRating === "easy"
                    ? "Facile (intervalle allongé)"
                    : "Bien (progression standard)"}
            </Text>
          </View>

          <Button
            title="Valider et enregistrer"
            disabled={a.busy}
            onPress={() => {
              if (
                plan.nextReviewAt &&
                new Date(plan.nextReviewAt).getTime() - Date.now() > 12 * 3600000
              ) {
                confirm(
                  "Valider en avance ?",
                  "Cette révision était prévue plus tard. L'algorithme FSRS adaptera le prochain intervalle.",
                  () => handleCommitReview(globalRating),
                );
              } else {
                handleCommitReview(globalRating);
              }
            }}
          />
        </Card>
      ) : totalItems > 0 && currentItem ? (
        <View style={{ gap: 16 }}>
          {/* Progression */}
          <View style={styles.progressHeader}>
            <Text style={[styles.progressCount, { color: c.textSecondary }]}>
              Fiche {currentIndex + 1} sur {totalItems}
            </Text>
            <Pill tone="primary">{currentItem.type}</Pill>
          </View>
          <View style={[styles.progressBar, { backgroundColor: c.border }]}>
            <View
              style={{
                height: 6,
                borderRadius: 6,
                backgroundColor: c.primary,
                width: `${((currentIndex + 1) / totalItems) * 100}%`,
              }}
            />
          </View>

          {/* Carte recto / verso */}
          <Card style={styles.flashcard}>
            <View style={styles.cardHeader}>
              <Layers color={c.primary} size={18} />
              <Text style={[styles.cardTypeLabel, { color: c.primary }]}>
                {currentItem.type === "question"
                  ? "QUESTION"
                  : currentItem.type === "cloze"
                    ? "TEXTE À TROUS"
                    : currentItem.type === "note"
                      ? "NOTE DE SYNTHÈSE"
                      : "RECTO"}
              </Text>
            </View>

            <Text style={[styles.cardFrontText, { color: c.textPrimary }]}>
              {currentItem.front || currentItem.back || "Pas de contenu"}
            </Text>

            {currentItem.hint && !showHint && (
              <Button
                secondary
                icon={HelpCircle}
                title="Afficher l'indice"
                onPress={() => setShowHint(true)}
              />
            )}

            {showHint && currentItem.hint && (
              <View style={[styles.hintBox, { backgroundColor: c.warningSoft }]}>
                <Text style={[styles.hintLabel, { color: c.warning }]}>Indice :</Text>
                <Text style={[styles.hintText, { color: c.textPrimary }]}>
                  {currentItem.hint}
                </Text>
              </View>
            )}

            {/* Réponse */}
            {!showAnswer ? (
              <Button
                icon={Eye}
                title="Afficher la réponse"
                onPress={() => setShowAnswer(true)}
              />
            ) : (
              <View style={[styles.answerContainer, { borderTopColor: c.border }]}>
                <Text style={[styles.answerHeader, { color: c.success }]}>RÉPONSE / VERSO</Text>
                <Text style={[styles.answerText, { color: c.textPrimary }]}>
                  {currentItem.back || currentItem.front}
                </Text>
              </View>
            )}
          </Card>

          {/* Auto-évaluation une fois la réponse affichée */}
          {showAnswer && (
            <View style={{ gap: 8 }}>
              <Label muted style={{ fontSize: 13, textAlign: "center" }}>
                Comment évalues-tu ton rappel actif ?
              </Label>
              {renderRatingButtons(handleRateItem, a.busy)}
            </View>
          )}
        </View>
      ) : (
        /* Cas où le cours n'a pas encore de StudyItem détaillés */
        <Card style={{ gap: 14 }}>
          <Label large>Auto-évaluation globale</Label>
          <Label muted>
            Ce cours ne comporte pas encore de fiches individuelles. Évalue globalement ta maîtrise du
            cours pour ajuster ton calendrier adaptatif.
          </Label>

          {renderRatingButtons((rating) => {
            setGlobalRating(rating);
            if (
              plan.nextReviewAt &&
              new Date(plan.nextReviewAt).getTime() - Date.now() > 12 * 3600000
            ) {
              confirm(
                "Valider en avance ?",
                "Cette révision était prévue plus tard. L'algorithme FSRS adaptera le prochain intervalle.",
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
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressCount: { fontSize: 13, fontWeight: "700" },
  progressBar: { height: 6, borderRadius: 6, overflow: "hidden" },
  flashcard: { minHeight: 220, gap: 16, padding: 22 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTypeLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  cardFrontText: { fontSize: 20, lineHeight: 28, fontWeight: "700" },
  hintBox: { padding: 12, borderRadius: 12, gap: 4 },
  hintLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  hintText: { fontSize: 14, lineHeight: 20 },
  answerContainer: { paddingTop: 16, borderTopWidth: 1, gap: 8 },
  answerHeader: { fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  answerText: { fontSize: 18, lineHeight: 26, fontWeight: "600" },
  ratingGrid: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  ratingButton: {
    flex: 1,
    minWidth: "45%",
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  ratingLabel: { fontSize: 15, fontWeight: "800" },
  resultCard: { alignItems: "center", padding: 28, gap: 16 },
  resultIcon: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryTitle: { fontSize: 18, fontWeight: "800" },
  breakdownRow: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 8 },
  breakdownItem: { alignItems: "center", gap: 2 },
  breakdownVal: { fontSize: 24, fontWeight: "900" },
  breakdownLabel: { fontSize: 11, fontWeight: "700" },
  assessmentBanner: { padding: 14, borderRadius: 14, gap: 4 },
  assessmentKicker: { fontSize: 12, fontWeight: "700" },
  assessmentValue: { fontSize: 16, fontWeight: "800" },
});
