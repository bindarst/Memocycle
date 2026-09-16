import React, { useState, useEffect, useRef, useCallback } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Play, Pause, RotateCcw, CheckCircle2, X, Layers } from "lucide-react-native";
import type { ReviewRating } from "@memocycle/contracts";
import type { Course, StudyItem, Subject, Module } from "../../src/database/entities";
import { newId } from "../../src/utils/ids";
import {
  Screen,
  Label,
  Button,
  Card,
  Pill,
  ErrorText,
  useAction,
  SectionTitle,
} from "../../src/ui/components";
import { useAuth } from "../../src/auth/AuthProvider";
import { find, all } from "../../src/database/repository";
import { completeReview } from "../../src/review/reviewService";
import { radius } from "../../src/theme/tokens";
import { usePalette } from "../../src/ui/components";

export default function StudySessionScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { userId } = useAuth();
  const palette = usePalette();
  const action = useAction();

  const [course, setCourse] = useState<Course | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [items, setItems] = useState<StudyItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Focus mode & timer state
  const [isFocusMode, setIsFocusMode] = useState(true);
  const [focusTargetMinutes, setFocusTargetMinutes] = useState(25);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Study items active index
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [ratings, setRatings] = useState<Record<string, ReviewRating>>({});
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let active = true;
    async function loadData() {
      if (!courseId) return;
      try {
        const c = (await find("course", courseId, userId)) as Course | null;
        if (!active || !c) return;
        setCourse(c);

        if (c.subjectId) {
          const s = (await find("subject", c.subjectId, userId)) as Subject | null;
          if (active) setSubject(s);
        }
        if (c.moduleId) {
          const m = (await find("module", c.moduleId, userId)) as Module | null;
          if (active) setModule(m);
        }

        const allItems = (await all("studyItem", userId)) as StudyItem[];
        const courseItems = allItems
          .filter((it) => it.courseId === courseId && !it.archivedAt)
          .sort((a, b) => a.position - b.position);
        if (active) setItems(courseItems);
      } catch (e) {
        console.error("Failed to load course for session:", e);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [courseId, userId]);

  // Timer effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
        if (isFocusMode) {
          setSecondsRemaining((prev) => {
            if (prev <= 1) {
              setIsRunning(false);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isFocusMode]);

  const handleStartPause = () => {
    setIsRunning((prev) => !prev);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setSecondsElapsed(0);
    setSecondsRemaining(focusTargetMinutes * 60);
  };

  const handleChangeFocusDuration = (mins: number) => {
    setFocusTargetMinutes(mins);
    setSecondsRemaining(mins * 60);
    setIsRunning(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleRateItem = (rating: ReviewRating) => {
    const currentItem = items[currentItemIndex];
    if (currentItem) {
      setRatings((prev) => ({ ...prev, [currentItem.id]: rating }));
    }
    setShowAnswer(false);
    if (currentItemIndex < items.length - 1) {
      setCurrentItemIndex((prev) => prev + 1);
    }
  };

  const calculateSessionRating = useCallback((): ReviewRating => {
    const ratingValues = Object.values(ratings);
    if (ratingValues.length === 0) return "good";
    const againCount = ratingValues.filter((r) => r === "again").length;
    const hardCount = ratingValues.filter((r) => r === "hard").length;
    const easyCount = ratingValues.filter((r) => r === "easy").length;
    const total = ratingValues.length;

    if (againCount / total >= 0.25) return "again";
    if (hardCount > total / 2) return "hard";
    if (easyCount / total >= 0.7) return "easy";
    return "good";
  }, [ratings]);

  const handleFinishAndSave = async () => {
    if (!courseId) return;
    const sessionRating = calculateSessionRating();
    await action.run(async () => {
      await completeReview(userId, courseId, "complete", newId(), sessionRating);
      setSessionCompleted(true);
      setTimeout(() => {
        router.replace("/(tabs)/today");
      }, 1200);
    });
  };

  if (loading || !course) {
    return (
      <Screen>
        <Label>Chargement de la session...</Label>
      </Screen>
    );
  }

  const currentItem = items[currentItemIndex];

  return (
    <Screen>
      {/* Header bar */}
      <View style={styles.headerRow}>
        <Button secondary title="Quitter" onPress={() => router.back()} icon={X} />
        <Pill tone={isRunning ? "success" : "primary"}>
          {isRunning ? "Session en cours" : "En pause"}
        </Pill>
      </View>

      <View style={{ gap: 4 }}>
        {subject && <Label muted>{subject.title}{module ? ` • ${module.title}` : ""}</Label>}
        <Label large>{course.title}</Label>
      </View>

      {/* Timer Card */}
      <Card style={styles.timerCard}>
        <View style={styles.timerHeader}>
          <Text style={[styles.timerModeLabel, { color: palette.textSecondary }]}>
            {isFocusMode ? `MODE FOCUS (${focusTargetMinutes} MIN)` : "CHRONOMÈTRE DE TRAVAIL"}
          </Text>
          <Pressable
            onPress={() => {
              setIsFocusMode(!isFocusMode);
              setIsRunning(false);
              setSecondsRemaining(focusTargetMinutes * 60);
            }}
          >
            <Text style={[styles.modeToggle, { color: palette.primary }]}>
              {isFocusMode ? "Changer en libre" : "Passer en Focus"}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.timerDisplay, { color: palette.textPrimary }]}>
          {formatTime(isFocusMode ? secondsRemaining : secondsElapsed)}
        </Text>

        {isFocusMode && !isRunning && (
          <View style={styles.durationSelector}>
            {[15, 25, 45, 60].map((mins) => (
              <Pressable
                key={mins}
                onPress={() => handleChangeFocusDuration(mins)}
                style={[
                  styles.durationButton,
                  {
                    borderColor: focusTargetMinutes === mins ? palette.primary : palette.border,
                    backgroundColor: focusTargetMinutes === mins ? palette.primarySoft : palette.surface,
                  },
                ]}
              >
                <Text
                  style={{
                    color: focusTargetMinutes === mins ? palette.primary : palette.textSecondary,
                    fontWeight: "700",
                    fontSize: 13,
                  }}
                >
                  {mins}m
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.timerControls}>
          <Button
            title={isRunning ? "Pause" : "Démarrer"}
            onPress={handleStartPause}
            icon={isRunning ? Pause : Play}
          />
          <Button
            secondary
            title="Réinitialiser"
            onPress={handleResetTimer}
            icon={RotateCcw}
          />
        </View>
      </Card>

      {/* Learning Items Section */}
      {items.length > 0 && currentItem ? (
        <View style={{ gap: 14 }}>
          <SectionTitle
            eyebrow="Rappel actif"
            title={`Fiche ${currentItemIndex + 1} sur ${items.length}`}
          />

          <Card style={{ gap: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Pill tone="primary">
                {currentItem.type === "flashcard"
                  ? "Flashcard"
                  : currentItem.type === "question"
                    ? "Question"
                    : currentItem.type === "cloze"
                      ? "Texte à trous"
                      : "Note"}
              </Pill>
              {ratings[currentItem.id] && (
                <Pill tone="success">
                  Évalué : {ratings[currentItem.id]}
                </Pill>
              )}
            </View>

            {/* Front / Question */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: palette.textSecondary, textTransform: "uppercase" }}>
                {currentItem.type === "question" ? "Question" : "Recto"}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "600", color: palette.textPrimary, lineHeight: 26 }}>
                {currentItem.front || currentItem.back || "Contenu de la fiche"}
              </Text>
            </View>

            {currentItem.hint && (
              <Text style={{ fontSize: 14, color: palette.warning, fontStyle: "italic" }}>
                Indice : {currentItem.hint}
              </Text>
            )}

            {/* Back / Answer */}
            {currentItem.type !== "note" && (
              showAnswer ? (
                <View
                  style={{
                    backgroundColor: palette.surfaceMuted,
                    padding: 16,
                    borderRadius: radius.card,
                    borderWidth: 1,
                    borderColor: palette.border,
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: palette.textSecondary, textTransform: "uppercase" }}>
                    Réponse
                  </Text>
                  <Text style={{ fontSize: 17, color: palette.textPrimary, lineHeight: 24 }}>
                    {currentItem.back}
                  </Text>
                </View>
              ) : (
                <Button
                  secondary
                  title="Afficher la réponse"
                  onPress={() => setShowAnswer(true)}
                />
              )
            )}

            {/* Rating Buttons */}
            {showAnswer && (
              <View style={{ gap: 10, marginTop: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: palette.textSecondary, textAlign: "center" }}>
                  Comment évalues-tu ton rappel ?
                </Text>
                <View style={styles.ratingGrid}>
                  <Pressable
                    style={[styles.ratingBtn, { backgroundColor: palette.dangerSoft, borderColor: palette.danger }]}
                    onPress={() => handleRateItem("again")}
                  >
                    <Text style={[styles.ratingBtnText, { color: palette.danger }]}>Oublié</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.ratingBtn, { backgroundColor: palette.warningSoft, borderColor: palette.warning }]}
                    onPress={() => handleRateItem("hard")}
                  >
                    <Text style={[styles.ratingBtnText, { color: palette.warning }]}>Difficile</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.ratingBtn, { backgroundColor: palette.primarySoft, borderColor: palette.primary }]}
                    onPress={() => handleRateItem("good")}
                  >
                    <Text style={[styles.ratingBtnText, { color: palette.primary }]}>Bien</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.ratingBtn, { backgroundColor: palette.successSoft, borderColor: palette.success }]}
                    onPress={() => handleRateItem("easy")}
                  >
                    <Text style={[styles.ratingBtnText, { color: palette.success }]}>Facile</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Navigation between items */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Button
                secondary
                disabled={currentItemIndex === 0}
                title="Précédent"
                onPress={() => {
                  setShowAnswer(false);
                  setCurrentItemIndex((prev) => Math.max(0, prev - 1));
                }}
              />
              <Button
                secondary
                disabled={currentItemIndex >= items.length - 1}
                title="Suivant"
                onPress={() => {
                  setShowAnswer(false);
                  setCurrentItemIndex((prev) => Math.min(items.length - 1, prev + 1));
                }}
              />
            </View>
          </Card>
        </View>
      ) : (
        <Card style={{ alignItems: "center", padding: 24, gap: 12 }}>
          <Layers size={36} color={palette.textSecondary} />
          <Label style={{ textAlign: "center" }}>
            Aucune fiche ni question créée pour ce cours.
          </Label>
          <Label muted style={{ textAlign: "center", fontSize: 14 }}>
            Tu peux réviser tes notes ou ton support de cours pendant que le minuteur tourne.
          </Label>
          <Button
            secondary
            title="Ajouter des fiches au cours"
            onPress={() => router.push(`/course/${course.id}`)}
          />
        </Card>
      )}

      {/* Completion Section */}
      <Card style={{ gap: 12, marginTop: 12 }}>
        <Label large style={{ fontSize: 18 }}>Valider la révision</Label>
        <Label muted>
          Une session terminée et validée enregistre tes progrès et reprogramme la prochaine révision avec le moteur adaptatif.
        </Label>
        <Button
          title={sessionCompleted ? "Révision enregistrée !" : "Terminer et valider la révision"}
          onPress={() => void handleFinishAndSave()}
          icon={CheckCircle2}
          disabled={sessionCompleted || action.busy}
        />
      </Card>

      <ErrorText message={action.error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timerCard: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 16,
  },
  timerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
  },
  timerModeLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  modeToggle: {
    fontSize: 13,
    fontWeight: "700",
  },
  timerDisplay: {
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  durationSelector: {
    flexDirection: "row",
    gap: 8,
  },
  durationButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  timerControls: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  ratingGrid: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  ratingBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: radius.button,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
