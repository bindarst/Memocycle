import React, { useState, useEffect, useRef, useCallback } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet, Pressable } from "react-native";
import {
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Layers01Icon,
} from "@hugeicons/core-free-icons";
import type { ReviewRating } from "@memocycle/contracts";
import type { Course, StudyItem, Subject, Module } from "../../src/database/entities";
import { newId } from "../../src/utils/ids";
import {
  Screen,
  Label,
  Button,
  IconButton,
  Card,
  Pill,
  ErrorText,
  useAction,
  SectionTitle,
  usePalette,
} from "../../src/ui/components";
import { AppIcon } from "../../src/ui/Icon";
import { useAuth } from "../../src/auth/AuthProvider";
import { find, all } from "../../src/database/repository";
import { completeReview } from "../../src/review/reviewService";
import { radius } from "../../src/theme/tokens";

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

        const allStudyItems = (await all("studyItem", userId)) as StudyItem[];
        const courseItems = allStudyItems
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
      }, 1000);
    });
  };

  if (loading || !course) {
    return (
      <Screen>
        <Label>Chargement...</Label>
      </Screen>
    );
  }

  const currentItem = items[currentItemIndex];

  return (
    <Screen>
      {/* Header bar */}
      <View style={styles.headerRow}>
        <IconButton
          icon={Cancel01Icon}
          accessibilityLabel="Quitter"
          onPress={() => router.back()}
        />
        <Pill tone={isRunning ? "success" : "primary"}>
          {isRunning ? "En cours" : "En pause"}
        </Pill>
      </View>

      <View style={{ gap: 2 }}>
        {subject && (
          <Text style={{ fontSize: 13, color: palette.textSecondary }}>
            {subject.title}{module ? ` • ${module.title}` : ""}
          </Text>
        )}
        <Label large>{course.title}</Label>
      </View>

      {/* Timer Card */}
      <Card style={styles.timerCard}>
        <View style={styles.timerHeader}>
          <Text style={[styles.timerModeLabel, { color: palette.textSecondary }]}>
            {isFocusMode ? `FOCUS ${focusTargetMinutes} MIN` : "CHRONO"}
          </Text>
          <Pressable
            onPress={() => {
              setIsFocusMode(!isFocusMode);
              setIsRunning(false);
              setSecondsRemaining(focusTargetMinutes * 60);
            }}
          >
            <Text style={[styles.modeToggle, { color: palette.primary }]}>
              {isFocusMode ? "Chrono libre" : "Mode Focus"}
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
                    fontWeight: "600",
                    fontSize: 12,
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
            size="md"
            title={isRunning ? "Pause" : "Démarrer"}
            onPress={handleStartPause}
            icon={isRunning ? PauseIcon : PlayIcon}
          />
          <Button
            size="md"
            variant="secondary"
            title="Réinitialiser"
            onPress={handleResetTimer}
            icon={RotateCcwIcon}
          />
        </View>
      </Card>

      {/* Learning Items Section */}
      {items.length > 0 && currentItem ? (
        <View style={{ gap: 10 }}>
          <SectionTitle
            title={`Fiche ${currentItemIndex + 1} / ${items.length}`}
          />

          <Card style={{ gap: 12, padding: 16 }}>
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
                  {ratings[currentItem.id]}
                </Pill>
              )}
            </View>

            {/* Front / Question */}
            <Text style={{ fontSize: 16, fontWeight: "600", color: palette.textPrimary, lineHeight: 22 }}>
              {currentItem.front || currentItem.back || "Contenu de la fiche"}
            </Text>

            {currentItem.hint && (
              <Text style={{ fontSize: 13, color: palette.warning, fontStyle: "italic" }}>
                Indice : {currentItem.hint}
              </Text>
            )}

            {/* Back / Answer */}
            {currentItem.type !== "note" && (
              showAnswer ? (
                <View
                  style={{
                    backgroundColor: palette.surfaceMuted,
                    padding: 12,
                    borderRadius: radius.card,
                    borderWidth: 1,
                    borderColor: palette.border,
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "600", color: palette.textSecondary }}>
                    RÉPONSE
                  </Text>
                  <Text style={{ fontSize: 15, color: palette.textPrimary, lineHeight: 20 }}>
                    {currentItem.back}
                  </Text>
                </View>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  title="Afficher la réponse"
                  onPress={() => setShowAnswer(true)}
                />
              )
            )}

            {/* Rating Buttons */}
            {showAnswer && (
              <View style={{ gap: 6, marginTop: 4 }}>
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
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              <Button
                size="sm"
                variant="ghost"
                disabled={currentItemIndex === 0}
                title="Précédent"
                onPress={() => {
                  setShowAnswer(false);
                  setCurrentItemIndex((prev) => Math.max(0, prev - 1));
                }}
              />
              <Button
                size="sm"
                variant="ghost"
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
        <Card style={{ alignItems: "center", padding: 20, gap: 8 }}>
          <AppIcon icon={Layers01Icon} size={28} color={palette.textSecondary} />
          <Label muted style={{ textAlign: "center", fontSize: 13 }}>
            Aucune fiche pour ce cours.
          </Label>
        </Card>
      )}

      {/* Completion Section */}
      <View style={{ marginTop: 8 }}>
        <Button
          fullWidth
          size="lg"
          title={sessionCompleted ? "Révision enregistrée !" : "Valider la session"}
          onPress={() => void handleFinishAndSave()}
          icon={CheckmarkCircle01Icon}
          disabled={sessionCompleted || action.busy}
        />
      </View>

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
    paddingVertical: 18,
    paddingHorizontal: 14,
    gap: 12,
  },
  timerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
  },
  timerModeLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  modeToggle: {
    fontSize: 12,
    fontWeight: "600",
  },
  timerDisplay: {
    fontSize: 44,
    fontWeight: "700",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  durationSelector: {
    flexDirection: "row",
    gap: 6,
  },
  durationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  timerControls: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    justifyContent: "center",
  },
  ratingGrid: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
  },
  ratingBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

