import React, { useState, useEffect, useRef, useCallback } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet, Pressable, AppState } from "react-native";
import {
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Layers01Icon,
} from "@hugeicons/core-free-icons";
import type { ReviewRating } from "@memocycle/contracts";
import type { Course, StudyItem, Subject, Module, Plan } from "../../src/database/entities";
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
import { timerSnapshot, transitionTimer, type StudyTimer, type TimerAction } from "../../src/session/studyTimer";
import { loadStudyTimer, saveStudyTimer, clearStudyTimer } from "../../src/session/timerRepository";

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

  const [timer, setTimer] = useState<StudyTimer | null>(null);
  const [now, setNow] = useState(Date.now());
  const [timerBusy, setTimerBusy] = useState(false);
  const [timerError, setTimerError] = useState("");
  const timerLocked = useRef(false);

  // Study items active index
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [ratings, setRatings] = useState<Record<string, ReviewRating>>({});
  const [sessionCompleted, setSessionCompleted] = useState(false);

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
          .filter((it) => it.courseId === courseId && !it.archivedAt && !it.deletedAt)
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

  useEffect(() => {
    if (!userId || !courseId) return;
    let active = true;
    setTimer(null);
    void loadStudyTimer(userId, courseId)
      .then((saved) => { if (active) { setTimer(saved); setNow(Date.now()); } })
      .catch(() => { if (active) setTimerError("Impossible de retrouver le chrono enregistré."); });
    return () => { active = false; };
  }, [courseId, userId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now());
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, []);

  const snapshot = timer ? timerSnapshot(timer, now) : null;
  const isFocusMode = timer?.mode === "focus";
  const isRunning = snapshot?.running ?? false;
  const focusTargetMinutes = timer?.focusMinutes ?? 25;

  const changeTimer = async (change: TimerAction) => {
    if (!timer || !userId || !courseId || timerLocked.current) return;
    timerLocked.current = true;
    setTimerBusy(true);
    setTimerError("");
    const timestamp = Date.now();
    const next = transitionTimer(timer, change, timestamp);
    try {
      await saveStudyTimer(userId, courseId, next);
      setTimer(next);
      setNow(timestamp);
    } catch {
      setTimerError("Le chrono n’a pas pu être enregistré. Réessaie.");
    } finally {
      timerLocked.current = false;
      setTimerBusy(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m >= 60) return `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
      const plan = (await all("reviewPlan", userId)).find((p) => p.courseId === courseId) as Plan | undefined;
      const command = !plan ? "start" : plan.status === "active" ? "complete" : "restart";
      const elapsedMs = timer ? timerSnapshot(timer, Date.now()).elapsedMs : 0;
      const durationSeconds = elapsedMs > 0 ? Math.max(1, Math.round(elapsedMs / 1000)) : undefined;
      await completeReview(userId, courseId, command, newId(), {
        rating: sessionRating,
        durationSeconds,
        sessionType: command === "complete" ? "scheduled_review" : "study",
      });
      try { await clearStudyTimer(userId, courseId); } catch (e) { console.error("Failed to clear completed timer:", e); }
      setSessionCompleted(true);
      setTimeout(() => {
        router.replace("/(tabs)/today");
      }, 1000);
    });
  };

  if (!loading && (!course || (!timer && timerError))) {
    return (
      <Screen>
        <IconButton icon={Cancel01Icon} accessibilityLabel="Retour" onPress={() => router.back()} />
        <Label>{course ? "Chrono indisponible" : "Cours introuvable"}</Label>
        <ErrorText message={timerError} />
      </Screen>
    );
  }

  if (loading || !course || !timer || !snapshot) {
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
          {isRunning ? "En cours" : snapshot.finished ? "Terminé" : "En pause"}
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
            accessibilityRole="button"
            accessibilityLabel={isFocusMode ? "Passer au chrono libre" : "Passer au mode Focus"}
            disabled={timerBusy}
            style={styles.modeButton}
            onPress={() => void changeTimer({ type: "mode" })}
          >
            <Text style={[styles.modeToggle, { color: palette.primary }]}>
              {isFocusMode ? "Chrono libre" : "Mode Focus"}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.timerDisplay, { color: palette.textPrimary }]}>
          {formatTime(isFocusMode ? snapshot.remainingSeconds : Math.floor(snapshot.elapsedMs / 1000))}
        </Text>

        <Text style={[styles.timerCaption, { color: palette.textSecondary }]}>
          {snapshot.finished ? "Session Focus terminée. Tu peux recommencer." : isRunning ? "Le temps continue même si tu quittes l’application." : "Ton temps est conservé quand tu quittes cette page."}
        </Text>

        {isFocusMode && (
          <View style={[styles.timerTrack, { backgroundColor: palette.surfaceMuted }]}>
            <View style={[styles.timerFill, { backgroundColor: palette.primary, width: `${snapshot.progress * 100}%` }]} />
          </View>
        )}

        {isFocusMode && !isRunning && (
          <View style={styles.durationSelector}>
            {[15, 25, 45, 60].map((mins) => (
              <Pressable
                key={mins}
                accessibilityRole="button"
                accessibilityState={{ selected: focusTargetMinutes === mins }}
                onPress={() => void changeTimer({ type: "duration", minutes: mins })}
                disabled={timerBusy}
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
            title={isRunning ? "Pause" : snapshot.finished ? "Recommencer" : "Démarrer"}
            onPress={() => void changeTimer({ type: "toggle" })}
            disabled={timerBusy}
            icon={isRunning ? PauseIcon : PlayIcon}
          />
          <Button
            size="md"
            variant="secondary"
            title="Réinitialiser"
            onPress={() => void changeTimer({ type: "reset" })}
            disabled={timerBusy}
            icon={RotateCcwIcon}
          />
        </View>
      </Card>
      <ErrorText message={timerError} />

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
          disabled={sessionCompleted || action.busy || timerBusy}
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
  modeButton: { minHeight: 44, justifyContent: "center" },
  timerDisplay: {
    fontSize: 44,
    fontWeight: "700",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  timerCaption: { fontSize: 12, textAlign: "center", lineHeight: 18, paddingHorizontal: 8 },
  timerTrack: { height: 6, width: "100%", borderRadius: 6, overflow: "hidden" },
  timerFill: { height: "100%", borderRadius: 6 },
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
