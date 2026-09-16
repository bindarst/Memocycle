import React, { useState } from "react";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  getISODay,
  isToday,
  isTomorrow,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { View, Pressable, StyleSheet, Text, Modal } from "react-native";
import { router } from "expo-router";
import {
  Calendar as CalendarIcon,
  Clock,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Play,
  Check,
} from "lucide-react-native";
import {
  type Course,
  type Exam,
  type Plan,
  settingsSchema,
} from "../../src/database/entities";
import {
  Screen,
  Label,
  Card,
  Button,
  Pill,
  useEntities,
  usePalette,
  useAction,
  SectionTitle,
  ErrorText,
} from "../../src/ui/components";
import { dayKey, displayDate } from "../../src/utils/dates";
import {
  balanceReviewWorkload,
  type WorkloadRebalanceProposal,
} from "../../src/planning/workloadBalancer";
import { save } from "../../src/database/repository";
import { useAuth } from "../../src/auth/AuthProvider";
import { radius } from "../../src/theme/tokens";

type CalendarViewMode = "Agenda" | "Semaine" | "Mois";

export default function Calendar() {
  const { userId } = useAuth();
  const c = usePalette();
  const action = useAction();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState<CalendarViewMode>("Agenda");
  const [selectedDay, setSelectedDay] = useState(dayKey(new Date()));

  // Rebalance modal state
  const [proposals, setProposals] = useState<WorkloadRebalanceProposal[]>([]);
  const [showRebalanceModal, setShowRebalanceModal] = useState(false);
  const [rebalanceSuccessMsg, setRebalanceSuccessMsg] = useState("");

  const plans = useEntities("reviewPlan") as Plan[];
  const courses = useEntities("course") as Course[];
  const exams = useEntities("exam") as Exam[];
  const rawSettings = useEntities("userSettings")[0];
  const settings = rawSettings ? settingsSchema.parse(rawSettings) : null;

  // Active items
  const activePlans = plans.filter(
    (p) =>
      p.status === "active" &&
      p.nextReviewAt &&
      courses.some((course) => course.id === p.courseId && !course.archivedAt),
  );

  const reviewItems = activePlans.map((p) => {
    const course = courses.find((course) => course.id === p.courseId);
    return {
      id: p.id,
      planId: p.id,
      courseId: p.courseId,
      type: "review" as const,
      at: String(p.nextReviewAt),
      title: course?.title ?? "Révision",
      estimatedMinutes: course?.estimatedReviewMinutes ?? 10,
    };
  });

  const examItems = exams
    .filter(
      (exam) =>
        new Date(String(exam.examAt)).getTime() >=
        startOfDay(new Date()).getTime() - 86400000,
    )
    .map((e) => ({
      id: e.id,
      planId: "",
      courseId: "",
      type: "exam" as const,
      at: String(e.examAt),
      title: e.title,
      estimatedMinutes: 0,
    }));

  const allItems = [...reviewItems, ...examItems].sort((a, b) =>
    a.at.localeCompare(b.at),
  );

  const agendaDays = [...new Set(allItems.map((item) => dayKey(new Date(item.at))))];

  // Selected day items & stats
  const selectedDayItems = allItems.filter(
    (item) => dayKey(new Date(item.at)) === selectedDay,
  );
  const selectedReviews = selectedDayItems.filter((i) => i.type === "review");
  const selectedExams = selectedDayItems.filter((i) => i.type === "exam");
  const selectedEstimatedMinutes = selectedReviews.reduce(
    (sum, i) => sum + i.estimatedMinutes,
    0,
  );

  // Auto rebalance handler
  const handleAutoRebalance = () => {
    const dailyTarget = settings?.dailyStudyMinutes ?? 45;
    const computedProposals = balanceReviewWorkload(
      activePlans,
      courses,
      exams,
      dailyTarget,
    );
    setProposals(computedProposals);
    setShowRebalanceModal(true);
    setRebalanceSuccessMsg("");
  };

  const handleApplyRebalance = async () => {
    await action.run(async () => {
      for (const prop of proposals) {
        const plan = activePlans.find((p) => p.id === prop.planId);
        if (plan) {
          const updatedPlan: Plan = {
            ...plan,
            nextReviewAt: prop.proposedDate,
            version: plan.version + 1,
            updatedAt: new Date().toISOString(),
          };
          await save("reviewPlan", userId, updatedPlan, plan.id);
        }
      }
      setRebalanceSuccessMsg(
        `${proposals.length} révision(s) ont été réparties de façon optimale !`,
      );
      setTimeout(() => {
        setShowRebalanceModal(false);
      }, 1500);
    });
  };

  // Week view dates
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Label large>Agenda & Planning</Label>
      </View>

      {/* Mode Switcher */}
      <View style={styles.modeTabs}>
        {(["Agenda", "Semaine", "Mois"] as CalendarViewMode[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setMode(tab)}
            style={[
              styles.modeTab,
              {
                backgroundColor:
                  mode === tab ? c.primary : c.surface,
                borderColor: mode === tab ? c.primary : c.border,
              },
            ]}
          >
            <Text
              style={{
                color: mode === tab ? c.onPrimary : c.textPrimary,
                fontWeight: "700",
                fontSize: 14,
              }}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: c.primary }]} />
          <Text style={[styles.legendText, { color: c.textSecondary }]}>
            Révisions
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: c.warning }]} />
          <Text style={[styles.legendText, { color: c.textSecondary }]}>
            Examens
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: c.success }]} />
          <Text style={[styles.legendText, { color: c.textSecondary }]}>
            Sessions
          </Text>
        </View>
      </View>

      {/* Action Buttons: Plan & Rebalance */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            secondary
            title="Répartir automatiquement"
            icon={Sparkles}
            onPress={handleAutoRebalance}
          />
        </View>
      </View>

      {/* Week View */}
      {mode === "Semaine" && (
        <Card>
          <View style={styles.navHeader}>
            <Pressable
              onPress={() => setCurrentDate(addWeeks(currentDate, -1))}
              style={styles.navBtn}
            >
              <ChevronLeft size={20} color={c.textPrimary} />
            </Pressable>
            <Label style={{ fontWeight: "700" }}>
              {format(weekStart, "d MMM", { locale: fr })} -{" "}
              {format(weekEnd, "d MMM yyyy", { locale: fr })}
            </Label>
            <Pressable
              onPress={() => setCurrentDate(addWeeks(currentDate, 1))}
              style={styles.navBtn}
            >
              <ChevronRight size={20} color={c.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.weekGrid}>
            {weekDays.map((d) => {
              const dKey = dayKey(d);
              const isSel = selectedDay === dKey;
              const isTod = isToday(d);
              const dItems = allItems.filter(
                (it) => dayKey(new Date(it.at)) === dKey,
              );
              const dReviews = dItems.filter((i) => i.type === "review");
              const dExams = dItems.filter((i) => i.type === "exam");
              const dMinutes = dReviews.reduce(
                (sum, i) => sum + i.estimatedMinutes,
                0,
              );

              return (
                <Pressable
                  key={dKey}
                  onPress={() => setSelectedDay(dKey)}
                  style={[
                    styles.weekDayCell,
                    {
                      backgroundColor: isSel
                        ? c.primarySoft
                        : isTod
                          ? c.surfaceMuted
                          : c.surface,
                      borderColor: isSel ? c.primary : c.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: isSel ? c.primary : c.textSecondary,
                    }}
                  >
                    {format(d, "EEE", { locale: fr }).toUpperCase()}
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: isSel ? c.primary : c.textPrimary,
                    }}
                  >
                    {format(d, "d")}
                  </Text>

                  <View style={{ flexDirection: "row", gap: 3, marginTop: 4 }}>
                    {dReviews.length > 0 && (
                      <View
                        style={[
                          styles.miniBadge,
                          { backgroundColor: c.primary },
                        ]}
                      />
                    )}
                    {dExams.length > 0 && (
                      <View
                        style={[
                          styles.miniBadge,
                          { backgroundColor: c.warning },
                        ]}
                      />
                    )}
                  </View>

                  {dMinutes > 0 && (
                    <Text
                      style={{
                        fontSize: 10,
                        color: c.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {dMinutes}m
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card>
      )}

      {/* Month View */}
      {mode === "Mois" && (
        <Card>
          <View style={styles.navHeader}>
            <Pressable
              onPress={() => setCurrentDate(addMonths(currentDate, -1))}
              style={styles.navBtn}
            >
              <ChevronLeft size={20} color={c.textPrimary} />
            </Pressable>
            <Label style={{ fontWeight: "700" }}>
              {format(currentDate, "MMMM yyyy", { locale: fr })}
            </Label>
            <Pressable
              onPress={() => setCurrentDate(addMonths(currentDate, 1))}
              style={styles.navBtn}
            >
              <ChevronRight size={20} color={c.textPrimary} />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((wd) => (
              <View
                key={wd}
                style={{
                  width: "14.28%",
                  alignItems: "center",
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: c.textSecondary,
                  }}
                >
                  {wd}
                </Text>
              </View>
            ))}

            {Array.from(
              { length: getISODay(startOfMonth(currentDate)) - 1 },
              (_, i) => (
                <View key={`blank${i}`} style={{ width: "14.28%" }} />
              ),
            )}

            {eachDayOfInterval({
              start: startOfMonth(currentDate),
              end: endOfMonth(currentDate),
            }).map((d) => {
              const dKey = dayKey(d);
              const isSel = selectedDay === dKey;
              const hasReviews = reviewItems.some(
                (i) => dayKey(new Date(i.at)) === dKey,
              );
              const hasExams = examItems.some(
                (i) => dayKey(new Date(i.at)) === dKey,
              );

              return (
                <Pressable
                  accessibilityLabel={format(d, "EEEE d MMMM", { locale: fr })}
                  key={dKey}
                  onPress={() => setSelectedDay(dKey)}
                  style={{
                    width: "14.28%",
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: radius.pill,
                    backgroundColor: isSel
                      ? c.primarySoft
                      : isToday(d)
                        ? c.surfaceMuted
                        : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: isSel ? "800" : isToday(d) ? "700" : "500",
                      color: isSel ? c.primary : c.textPrimary,
                    }}
                  >
                    {format(d, "d")}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 2, marginTop: 2 }}>
                    {hasReviews && (
                      <View
                        style={[
                          styles.miniBadge,
                          { backgroundColor: c.primary },
                        ]}
                      />
                    )}
                    {hasExams && (
                      <View
                        style={[
                          styles.miniBadge,
                          { backgroundColor: c.warning },
                        ]}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>
      )}

      {/* Selected Day Details (for Week & Month views) */}
      {mode !== "Agenda" && (
        <View style={{ gap: 12 }}>
          <SectionTitle
            eyebrow={
              isToday(new Date(`${selectedDay}T12:00:00`))
                ? "Aujourd'hui"
                : isTomorrow(new Date(`${selectedDay}T12:00:00`))
                  ? "Demain"
                  : format(new Date(`${selectedDay}T12:00:00`), "EEEE", {
                      locale: fr,
                    })
            }
            title={format(
              new Date(`${selectedDay}T12:00:00`),
              "d MMMM yyyy",
              { locale: fr },
            )}
          />

          {/* Daily Workload Summary Card */}
          <Card style={{ flexDirection: "row", justifyContent: "space-around" }}>
            <View style={{ alignItems: "center", gap: 4 }}>
              <Clock size={20} color={c.primary} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  color: c.textPrimary,
                }}
              >
                {selectedEstimatedMinutes} min
              </Text>
              <Text style={{ fontSize: 12, color: c.textSecondary }}>
                Temps estimé
              </Text>
            </View>

            <View style={{ alignItems: "center", gap: 4 }}>
              <CalendarIcon size={20} color={c.primary} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  color: c.textPrimary,
                }}
              >
                {selectedReviews.length}
              </Text>
              <Text style={{ fontSize: 12, color: c.textSecondary }}>
                Révision{selectedReviews.length > 1 ? "s" : ""}
              </Text>
            </View>

            <View style={{ alignItems: "center", gap: 4 }}>
              <GraduationCap size={20} color={c.warning} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  color: c.textPrimary,
                }}
              >
                {selectedExams.length}
              </Text>
              <Text style={{ fontSize: 12, color: c.textSecondary }}>
                Examen{selectedExams.length > 1 ? "s" : ""}
              </Text>
            </View>
          </Card>

          {/* Items List */}
          {selectedDayItems.length > 0 ? (
            selectedDayItems.map((item) => (
              <Card
                key={item.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <Pill tone={item.type === "exam" ? "warning" : "primary"}>
                      {item.type === "exam" ? "Examen" : "Révision"}
                    </Pill>
                    {item.estimatedMinutes > 0 && (
                      <Text style={{ fontSize: 12, color: c.textSecondary }}>
                        ~{item.estimatedMinutes} min
                      </Text>
                    )}
                  </View>
                  <Label style={{ fontWeight: "700", fontSize: 16 }}>
                    {item.title}
                  </Label>
                  <Label muted style={{ fontSize: 13 }}>
                    {displayDate(item.at)}
                  </Label>
                </View>

                {item.type === "review" && item.courseId && (
                  <Button
                    title="Session"
                    onPress={() => router.push(`/session/${item.courseId}`)}
                    icon={Play}
                  />
                )}
              </Card>
            ))
          ) : (
            <Card style={{ alignItems: "center", padding: 20 }}>
              <Label muted>Aucune révision ni examen pour cette date.</Label>
            </Card>
          )}
        </View>
      )}

      {/* Agenda Mode: list all upcoming days */}
      {mode === "Agenda" && (
        <View style={{ gap: 18 }}>
          {agendaDays.map((day) => {
            const date = new Date(`${day}T12:00:00`);
            const dayItems = allItems.filter(
              (item) => dayKey(new Date(item.at)) === day,
            );
            const reviews = dayItems.filter((i) => i.type === "review");
            const dayMins = reviews.reduce(
              (sum, i) => sum + i.estimatedMinutes,
              0,
            );

            return (
              <View key={day} style={{ gap: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <Label large style={{ fontSize: 18 }}>
                    {isToday(date)
                      ? "Aujourd’hui"
                      : isTomorrow(date)
                        ? "Demain"
                        : format(date, "EEEE d MMMM", { locale: fr })}
                  </Label>
                  <Text style={{ fontSize: 13, color: c.textSecondary }}>
                    {reviews.length} révision{reviews.length > 1 ? "s" : ""}{" "}
                    {dayMins > 0 ? `(~${dayMins} min)` : ""}
                  </Text>
                </View>

                {dayItems.map((item) => (
                  <Card
                    key={item.id}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <Pill
                          tone={item.type === "exam" ? "warning" : "primary"}
                        >
                          {item.type === "exam" ? "Examen" : "Révision"}
                        </Pill>
                        {item.estimatedMinutes > 0 && (
                          <Text style={{ fontSize: 12, color: c.textSecondary }}>
                            ~{item.estimatedMinutes} min
                          </Text>
                        )}
                      </View>
                      <Label style={{ fontWeight: "700", fontSize: 16 }}>
                        {item.title}
                      </Label>
                      <Label muted style={{ fontSize: 13 }}>
                        {displayDate(item.at)}
                      </Label>
                    </View>

                    {item.type === "review" && item.courseId && (
                      <Button
                        title="Session"
                        onPress={() => router.push(`/session/${item.courseId}`)}
                        icon={Play}
                      />
                    )}
                  </Card>
                ))}
              </View>
            );
          })}

          {!allItems.length && (
            <Card style={{ alignItems: "center", padding: 24 }}>
              <Label muted>
                Tes prochaines révisions et dates d’examen apparaîtront ici.
              </Label>
            </Card>
          )}
        </View>
      )}

      {/* Auto Rebalance Modal */}
      <Modal
        visible={showRebalanceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRebalanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <SectionTitle
              eyebrow="Équilibrage intelligent"
              title="Répartition de la charge"
            />

            {rebalanceSuccessMsg ? (
              <View style={{ gap: 12, alignItems: "center", paddingVertical: 20 }}>
                <Check size={36} color={c.success} />
                <Label style={{ textAlign: "center", fontWeight: "700" }}>
                  {rebalanceSuccessMsg}
                </Label>
              </View>
            ) : proposals.length > 0 ? (
              <View style={{ gap: 14 }}>
                <Label muted>
                  Le planificateur a détecté des jours surchargés et te propose
                  de décaler {proposals.length} révision(s) non urgente(s) :
                </Label>

                {proposals.map((prop) => (
                  <View
                    key={prop.planId}
                    style={[
                      styles.proposalItem,
                      {
                        backgroundColor: c.surfaceMuted,
                        borderColor: c.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "700",
                          color: c.textPrimary,
                        }}
                      >
                        {prop.courseTitle}
                      </Text>
                      <Text style={{ fontSize: 13, color: c.textSecondary }}>
                        {prop.reason}
                      </Text>
                    </View>
                    <Pill
                      tone={
                        prop.impact === "Peu d’impact"
                          ? "success"
                          : prop.impact === "Impact modéré"
                            ? "warning"
                            : "primary"
                      }
                    >
                      {prop.impact}
                    </Pill>
                  </View>
                ))}

                <View style={{ gap: 8, marginTop: 8 }}>
                  <Button
                    title={`Appliquer la répartition (${proposals.length})`}
                    onPress={() => void handleApplyRebalance()}
                    disabled={action.busy}
                  />
                  <Button
                    secondary
                    title="Annuler"
                    onPress={() => setShowRebalanceModal(false)}
                  />
                </View>
              </View>
            ) : (
              <View style={{ gap: 14, paddingVertical: 10 }}>
                <Label muted>
                  Ton planning est déjà bien équilibré ! Aucune surcharge n'a été
                  détectée sur les 14 prochains jours.
                </Label>
                <Button
                  secondary
                  title="Fermer"
                  onPress={() => setShowRebalanceModal(false)}
                />
              </View>
            )}

            <ErrorText message={action.error} />
          </View>
        </View>
      </Modal>

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
  modeTabs: {
    flexDirection: "row",
    gap: 8,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  legendRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "600",
  },
  navHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  navBtn: {
    padding: 8,
  },
  weekGrid: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
  },
  weekDayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 2,
  },
  miniBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    gap: 16,
    maxHeight: "85%",
  },
  proposalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: radius.card,
    borderWidth: 1,
  },
});
