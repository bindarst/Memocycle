import React, { useState } from "react";
import {
  addMonths,
  addDays,
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
  Calendar01Icon,
  Clock01Icon,
  GraduationCapIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  Tick01Icon,
  Add01Icon,
} from "@hugeicons/core-free-icons";
import {
  type Course,
  type Exam,
  type Plan,
  type StudySession,
  settingsSchema,
} from "../../src/database/entities";
import type { UnifiedCalendarEvent } from "@memocycle/contracts";
import {
  detectCalendarConflicts,
  suggestAlternativeStudySlots,
  type CalendarConflict,
  type AlternativeSlotProposal,
} from "../../src/calendar/calendarService";
import { fetchDeviceEvents } from "../../src/calendar/localCalendarService";
import {
  Screen,
  Label,
  Card,
  Button,
  IconButton,
  SegmentedControl,
  Pill,
  useEntities,
  usePalette,
  useAction,
  SectionTitle,
  ErrorText,
} from "../../src/ui/components";
import { AppIcon } from "../../src/ui/Icon";
import { dayKey } from "../../src/utils/dates";
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
  const [externalEvents, setExternalEvents] = useState<UnifiedCalendarEvent[]>([]);
  
  // Conflict modal state
  const [selectedConflict, setSelectedConflict] = useState<CalendarConflict | null>(null);
  const [conflictProposals, setConflictProposals] = useState<AlternativeSlotProposal[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictSuccessMsg, setConflictSuccessMsg] = useState("");

  // Quick plan state
  const [quickPlanCourse, setQuickPlanCourse] = useState<Course | null>(null);

  const plans = useEntities("reviewPlan") as Plan[];
  const courses = useEntities("course") as Course[];
  const exams = useEntities("exam") as Exam[];
  const sessions = useEntities("studySession") as StudySession[];
  const rawSettings = useEntities("userSettings")[0];
  const settings = rawSettings ? settingsSchema.parse(rawSettings) : null;

  React.useEffect(() => {
    void fetchDeviceEvents(
      new Date(Date.now() - 7 * 86400000).toISOString(),
      new Date(Date.now() + 60 * 86400000).toISOString(),
    ).then(setExternalEvents);
  }, []);

  // Active items
  const activePlans = plans.filter(
    (p) =>
      p.status === "active" &&
      p.nextReviewAt &&
      courses.some((course) => course.id === p.courseId && !course.archivedAt),
  );

  const reviewItems = activePlans.map((p) => {
    const course = courses.find((crs) => crs.id === p.courseId);
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

  const sessionItems = sessions
    .filter((s) => s.status !== "cancelled")
    .map((s) => {
      const course = courses.find((c) => c.id === s.courseId);
      const start = new Date(s.plannedStartAt);
      const end = new Date(s.plannedEndAt);
      const minutes = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
      return {
        id: s.id,
        planId: "",
        courseId: s.courseId,
        type: "study_session" as const,
        at: s.plannedStartAt,
        title: course ? `Étude : ${course.title}` : "Session d'étude",
        estimatedMinutes: minutes,
      };
    });

  const extItems = externalEvents.map((ev) => ({
    id: ev.id,
    planId: "",
    courseId: "",
    type: "external" as const,
    at: ev.startAt,
    title: ev.title,
    estimatedMinutes: 60,
  }));

  const allItems = [...reviewItems, ...examItems, ...sessionItems, ...extItems].sort((a, b) =>
    a.at.localeCompare(b.at),
  );

  // Conflicts
  const conflicts = detectCalendarConflicts(
    allItems
      .filter((i) => i.type === "review" || i.type === "study_session")
      .map((i) => ({
        id: i.id,
        title: i.title,
        type: i.type,
        startAt: i.at,
        endAt: new Date(new Date(i.at).getTime() + (i.estimatedMinutes || 30) * 60000).toISOString(),
      })),
    externalEvents,
  );

  const handleOpenConflict = (conflict: CalendarConflict) => {
    setSelectedConflict(conflict);
    const proposals = suggestAlternativeStudySlots(
      conflict,
      externalEvents,
      settings?.preferredStudyTime ?? "18:00",
      30,
    );
    setConflictProposals(proposals);
    setConflictSuccessMsg("");
    setShowConflictModal(true);
  };

  const handleApplyAlternativeSlot = async (slot: AlternativeSlotProposal) => {
    if (!selectedConflict) return;
    await action.run(async () => {
      if (selectedConflict.eventType === "study_session") {
        const session = sessions.find((s) => s.id === selectedConflict.eventId);
        if (session) {
          const updated: StudySession = {
            ...session,
            plannedStartAt: slot.startAt,
            plannedEndAt: slot.endAt,
            version: session.version + 1,
            updatedAt: new Date().toISOString(),
          };
          await save("studySession", userId, updated, session.id);
        }
      } else if (selectedConflict.eventType === "review") {
        const plan = activePlans.find((p) => p.id === selectedConflict.eventId);
        if (plan) {
          const updated: Plan = {
            ...plan,
            nextReviewAt: slot.startAt,
            version: plan.version + 1,
            updatedAt: new Date().toISOString(),
          };
          await save("reviewPlan", userId, updated, plan.id);
        }
      }
      setConflictSuccessMsg(`Déplacé vers ${slot.label}`);
      setTimeout(() => {
        setShowConflictModal(false);
      }, 1000);
    });
  };

  const handleQuickSchedule = async (targetDate: Date) => {
    if (!quickPlanCourse) return;
    await action.run(async () => {
      const start = new Date(targetDate);
      start.setHours(18, 0, 0, 0);
      const end = new Date(start.getTime() + (quickPlanCourse.estimatedReviewMinutes || 30) * 60000);
      const newSession: StudySession = {
        id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId,
        courseId: quickPlanCourse.id,
        plannedStartAt: start.toISOString(),
        plannedEndAt: end.toISOString(),
        actualStartAt: null,
        actualEndAt: null,
        method: null,
        status: "planned",
        version: 1,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await save("studySession", userId, newSession, newSession.id);
      setQuickPlanCourse(null);
    });
  };

  // "À planifier" items (unscheduled courses or courses with upcoming exams without study sessions)
  const toPlanItems = courses
    .filter((c) => !c.archivedAt)
    .map((c) => {
      const hasPlan = activePlans.some((p) => p.courseId === c.id);
      const courseExams = exams.filter((e) => {
        const isLinked = (c.examIds ?? []).includes(e.id);
        const isFuture = new Date(String(e.examAt)).getTime() >= Date.now();
        return isLinked && isFuture;
      });
      const hasUpcomingSession = sessions.some(
        (s) => s.courseId === c.id && s.status === "planned" && new Date(s.plannedStartAt).getTime() >= Date.now(),
      );
      const nearExam = courseExams[0];

      if (!hasPlan) {
        return { course: c, reason: "Sans révision planifiée", nearExam };
      }
      if (nearExam && !hasUpcomingSession) {
        return { course: c, reason: `Examen le ${format(new Date(String(nearExam.examAt)), "d MMM", { locale: fr })}`, nearExam };
      }
      return null;
    })
    .filter(Boolean) as Array<{ course: Course; reason: string; nearExam?: Exam }>;

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
        `${proposals.length} révision(s) réparties de façon optimale.`,
      );
      setTimeout(() => {
        setShowRebalanceModal(false);
      }, 1200);
    });
  };

  // Week view dates
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const nextSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(startOfDay(new Date()), index);
    const key = dayKey(date);
    const items = allItems.filter((item) => dayKey(new Date(item.at)) === key);
    const minutes = items.reduce(
      (sum, item) => sum + (item.type === "external" || item.type === "exam" ? 0 : item.estimatedMinutes),
      0,
    );
    return { date, key, items: items.length, minutes };
  });
  const weeklyMinutes = nextSevenDays.reduce((sum, day) => sum + day.minutes, 0);
  const dailyTarget = settings?.dailyStudyMinutes ?? 45;

  // Render individual event item
  const renderEventCard = (item: (typeof allItems)[0]) => {
    const itemConflict = conflicts.find((cf) => cf.eventId === item.id);
    let icon = SparklesIcon;
    let pillTone: "primary" | "warning" | "muted" = "primary";
    let pillLabel = "Révision";

    if (item.type === "exam") {
      icon = GraduationCapIcon;
      pillTone = "warning";
      pillLabel = "Examen";
    } else if (item.type === "study_session") {
      icon = Clock01Icon;
      pillTone = "primary";
      pillLabel = "Session";
    } else if (item.type === "external") {
      icon = Calendar01Icon;
      pillTone = "muted";
      pillLabel = "Externe";
    }

    const hasSpecificTime = item.at.includes("T") && !item.at.endsWith("T00:00:00.000Z");
    const timeStr = hasSpecificTime ? format(new Date(item.at), "HH:mm") : null;

    return (
      <Card
        key={item.id}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderColor: itemConflict ? c.warning : c.border,
        }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <AppIcon
                icon={icon}
                size={13}
                color={
                  pillTone === "warning"
                    ? c.warning
                    : pillTone === "muted"
                    ? c.textSecondary
                    : c.primary
                }
              />
              <Pill tone={pillTone}>{pillLabel}</Pill>
            </View>

            {timeStr && (
              <Text style={{ fontSize: 12, fontWeight: "600", color: c.textPrimary }}>
                {timeStr}
              </Text>
            )}

            {item.estimatedMinutes > 0 && item.type !== "external" && (
              <Text style={{ fontSize: 12, color: c.textSecondary }}>
                ~{item.estimatedMinutes} min
              </Text>
            )}

            {itemConflict && (
              <Pressable
                onPress={() => handleOpenConflict(itemConflict)}
                accessibilityLabel="Conflit horaire"
              >
                <Pill tone="warning">Conflit horaire</Pill>
              </Pressable>
            )}
          </View>

          <Text style={{ fontWeight: "600", fontSize: 14, color: c.textPrimary }}>
            {item.title}
          </Text>
        </View>

        {(item.type === "review" || item.type === "study_session") && item.courseId && (
          <Button
            size="sm"
            variant="secondary"
            title="Session"
            onPress={() => router.push(`/session/${item.courseId}`)}
            icon={PlayIcon}
          />
        )}
      </Card>
    );
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Label large>Planning</Label>
        <Button
          size="sm"
          variant="secondary"
          icon={SparklesIcon}
          title="Équilibrer"
          onPress={handleAutoRebalance}
        />
      </View>

      {/* Mode Switcher */}
      <SegmentedControl
        options={[
          { label: "Agenda", value: "Agenda" },
          { label: "Semaine", value: "Semaine" },
          { label: "Mois", value: "Mois" },
        ]}
        value={mode}
        onChange={(v) => setMode(v as CalendarViewMode)}
      />

      <Card style={{ gap: 12, padding: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: c.textPrimary, fontSize: 15, fontWeight: "700" }}>
              Charge des 7 prochains jours
            </Text>
            <Text style={{ color: c.textSecondary, fontSize: 12 }}>
              {weeklyMinutes} min planifiées · objectif {dailyTarget * 7} min
            </Text>
          </View>
          {conflicts.length > 0 && <Pill tone="warning">{conflicts.length} conflit{conflicts.length > 1 ? "s" : ""}</Pill>}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 5 }}>
          {nextSevenDays.map((day) => {
            const overloaded = day.minutes > dailyTarget;
            const selected = selectedDay === day.key;
            return (
              <Pressable
                key={day.key}
                accessibilityRole="button"
                accessibilityLabel={`${format(day.date, "EEEE d MMMM", { locale: fr })}, ${day.minutes} minutes`}
                onPress={() => {
                  setSelectedDay(day.key);
                  setCurrentDate(day.date);
                  if (mode === "Agenda") setMode("Semaine");
                }}
                style={{ flex: 1, alignItems: "center", gap: 5, paddingVertical: 7, borderRadius: 9, backgroundColor: selected ? c.primarySoft : c.surfaceMuted }}
              >
                <Text style={{ fontSize: 10, fontWeight: "700", color: selected ? c.primary : c.textSecondary }}>
                  {format(day.date, "EEE", { locale: fr }).slice(0, 2).toUpperCase()}
                </Text>
                <View style={{ width: "70%", height: 34, borderRadius: 6, backgroundColor: c.border, justifyContent: "flex-end", overflow: "hidden" }}>
                  <View style={{ height: `${Math.max(8, Math.min(100, (day.minutes / Math.max(1, dailyTarget)) * 100))}%`, backgroundColor: overloaded ? c.warning : c.primary }} />
                </View>
                <Text style={{ fontSize: 9, fontWeight: "600", color: overloaded ? c.warning : c.textSecondary }}>
                  {day.minutes}m
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Box "À planifier" (unscheduled courses or exams without study session) */}
      {toPlanItems.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionTitle title="À planifier" />
          {toPlanItems.slice(0, 3).map(({ course, reason }) => (
            <Card
              key={course.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: c.textPrimary }}>
                  {course.title}
                </Text>
                <Text style={{ fontSize: 12, color: c.textSecondary }}>
                  {reason}
                </Text>
              </View>
              <Button
                size="sm"
                variant="secondary"
                title="Planifier"
                icon={Add01Icon}
                onPress={() => setQuickPlanCourse(course)}
              />
            </Card>
          ))}
        </View>
      )}

      {/* Week View */}
      {mode === "Semaine" && (
        <Card style={{ padding: 12, gap: 10 }}>
          <View style={styles.navHeader}>
            <IconButton
              icon={ChevronLeftIcon}
              accessibilityLabel="Semaine précédente"
              onPress={() => setCurrentDate(addWeeks(currentDate, -1))}
            />
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.textPrimary }}>
              {format(weekStart, "d MMM", { locale: fr })} –{" "}
              {format(weekEnd, "d MMM yyyy", { locale: fr })}
            </Text>
            <IconButton
              icon={ChevronRightIcon}
              accessibilityLabel="Semaine suivante"
              onPress={() => setCurrentDate(addWeeks(currentDate, 1))}
            />
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
                      fontSize: 11,
                      fontWeight: "600",
                      color: isSel ? c.primary : c.textSecondary,
                    }}
                  >
                    {format(d, "EEE", { locale: fr }).toUpperCase()}
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: isSel ? c.primary : c.textPrimary,
                    }}
                  >
                    {format(d, "d")}
                  </Text>

                  <View style={{ flexDirection: "row", gap: 3, marginTop: 2 }}>
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
                        marginTop: 1,
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
        <Card style={{ padding: 12, gap: 8 }}>
          <View style={styles.navHeader}>
            <IconButton
              icon={ChevronLeftIcon}
              accessibilityLabel="Mois précédent"
              onPress={() => setCurrentDate(addMonths(currentDate, -1))}
            />
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.textPrimary }}>
              {format(currentDate, "MMMM yyyy", { locale: fr })}
            </Text>
            <IconButton
              icon={ChevronRightIcon}
              accessibilityLabel="Mois suivant"
              onPress={() => setCurrentDate(addMonths(currentDate, 1))}
            />
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((wd) => (
              <View
                key={wd}
                style={{
                  width: "14.28%",
                  alignItems: "center",
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
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
                    minHeight: 38,
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
                      fontSize: 13,
                      fontWeight: isSel ? "700" : isToday(d) ? "600" : "500",
                      color: isSel ? c.primary : c.textPrimary,
                    }}
                  >
                    {format(d, "d")}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 2, marginTop: 1 }}>
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
        <View style={{ gap: 8 }}>
          <SectionTitle
            title={
              isToday(new Date(`${selectedDay}T12:00:00`))
                ? `Aujourd’hui (${format(new Date(`${selectedDay}T12:00:00`), "d MMMM", { locale: fr })})`
                : format(new Date(`${selectedDay}T12:00:00`), "EEEE d MMMM", {
                    locale: fr,
                  })
            }
          />

          {/* Daily Workload Summary Card */}
          <Card
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              paddingVertical: 10,
            }}
          >
            <View style={{ alignItems: "center", gap: 2 }}>
              <AppIcon icon={Clock01Icon} size={16} color={c.primary} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: c.textPrimary,
                }}
              >
                {selectedEstimatedMinutes} min
              </Text>
            </View>

            <View style={{ alignItems: "center", gap: 2 }}>
              <AppIcon icon={Calendar01Icon} size={16} color={c.primary} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: c.textPrimary,
                }}
              >
                {selectedReviews.length} rév.
              </Text>
            </View>

            <View style={{ alignItems: "center", gap: 2 }}>
              <AppIcon icon={GraduationCapIcon} size={16} color={c.warning} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: c.textPrimary,
                }}
              >
                {selectedExams.length} exa.
              </Text>
            </View>
          </Card>

          {/* Items List */}
          {selectedDayItems.length > 0 ? (
            selectedDayItems.map(renderEventCard)
          ) : (
            <Card style={{ alignItems: "center", paddingVertical: 14 }}>
              <Text style={{ fontSize: 13, color: c.textSecondary }}>
                Aucune échéance
              </Text>
            </Card>
          )}
        </View>
      )}

      {/* Agenda Mode */}
      {mode === "Agenda" && (
        <View style={{ gap: 12 }}>
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
              <View key={day} style={{ gap: 6 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: c.textPrimary,
                    }}
                  >
                    {isToday(date)
                      ? "Aujourd’hui"
                      : isTomorrow(date)
                      ? "Demain"
                      : format(date, "EEEE d MMMM", { locale: fr })}
                  </Text>
                  <Text style={{ fontSize: 12, color: c.textSecondary }}>
                    {reviews.length} rév. {dayMins > 0 ? `(~${dayMins} min)` : ""}
                  </Text>
                </View>

                {dayItems.map(renderEventCard)}
              </View>
            );
          })}

          {!allItems.length && (
            <Card style={{ alignItems: "center", paddingVertical: 20 }}>
              <Text style={{ fontSize: 13, color: c.textSecondary }}>
                Aucune échéance
              </Text>
            </Card>
          )}
        </View>
      )}

      {/* Conflict Modal */}
      <Modal
        visible={showConflictModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConflictModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <SectionTitle title="Conflit horaire" />
            {selectedConflict && (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 13, color: c.textSecondary }}>
                  « {selectedConflict.eventTitle} » chevauche un créneau externe (« {selectedConflict.conflictingWith.externalTitle} »).
                </Text>

                {conflictSuccessMsg ? (
                  <View style={{ gap: 8, alignItems: "center", paddingVertical: 12 }}>
                    <AppIcon icon={Tick01Icon} size={28} color={c.success} />
                    <Text style={{ fontWeight: "600", color: c.textPrimary }}>
                      {conflictSuccessMsg}
                    </Text>
                  </View>
                ) : conflictProposals.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: c.textPrimary }}>
                      Créneaux alternatifs proposés :
                    </Text>
                    {conflictProposals.map((prop, idx) => (
                      <Pressable
                        key={idx}
                        onPress={() => void handleApplyAlternativeSlot(prop)}
                        style={[
                          styles.proposalItem,
                          { backgroundColor: c.surfaceMuted, borderColor: c.border },
                        ]}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ fontSize: 13, fontWeight: "600", color: c.textPrimary }}>
                            {prop.label}
                          </Text>
                          {prop.fitsPreferredTime && (
                            <Text style={{ fontSize: 11, color: c.primary }}>
                              Heure habituelle
                            </Text>
                          )}
                        </View>
                        <Button
                          size="sm"
                          title="Choisir"
                          onPress={() => void handleApplyAlternativeSlot(prop)}
                          disabled={action.busy}
                        />
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={{ fontSize: 13, color: c.textSecondary }}>
                    Aucun créneau libre évident trouvé à proximité.
                  </Text>
                )}

                <Button
                  variant="ghost"
                  title="Fermer"
                  onPress={() => setShowConflictModal(false)}
                  style={{ alignSelf: "center", marginTop: 4 }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Quick Plan Modal */}
      <Modal
        visible={!!quickPlanCourse}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickPlanCourse(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <SectionTitle title={`Planifier : ${quickPlanCourse?.title ?? ""}`} />
            <View style={{ gap: 8 }}>
              <Button
                title="Aujourd’hui (18:00)"
                onPress={() => void handleQuickSchedule(new Date())}
              />
              <Button
                variant="secondary"
                title="Demain (18:00)"
                onPress={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  void handleQuickSchedule(tomorrow);
                }}
              />
              <Button
                variant="ghost"
                title="Annuler"
                onPress={() => setQuickPlanCourse(null)}
              />
            </View>
          </View>
        </View>
      </Modal>

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
            <SectionTitle title="Équilibrage de la charge" />

            {rebalanceSuccessMsg ? (
              <View
                style={{
                  gap: 10,
                  alignItems: "center",
                  paddingVertical: 16,
                }}
              >
                <AppIcon icon={Tick01Icon} size={32} color={c.success} />
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    color: c.textPrimary,
                  }}
                >
                  {rebalanceSuccessMsg}
                </Text>
              </View>
            ) : proposals.length > 0 ? (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 13, color: c.textSecondary }}>
                  {proposals.length} révision(s) peuvent être réparties :
                </Text>

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
                          fontSize: 14,
                          fontWeight: "600",
                          color: c.textPrimary,
                        }}
                      >
                        {prop.courseTitle}
                      </Text>
                      <Text style={{ fontSize: 12, color: c.textSecondary }}>
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

                <View style={{ gap: 6, marginTop: 6 }}>
                  <Button
                    fullWidth
                    size="md"
                    title={`Appliquer (${proposals.length})`}
                    onPress={() => void handleApplyRebalance()}
                    disabled={action.busy}
                  />
                  <Button
                    variant="ghost"
                    title="Annuler"
                    onPress={() => setShowRebalanceModal(false)}
                    style={{ alignSelf: "center" }}
                  />
                </View>
              </View>
            ) : (
              <View style={{ gap: 12, paddingVertical: 8 }}>
                <Text style={{ fontSize: 13, color: c.textSecondary }}>
                  Planning équilibré. Aucune surcharge détectée.
                </Text>
                <Button
                  size="sm"
                  variant="secondary"
                  title="Fermer"
                  onPress={() => setShowRebalanceModal(false)}
                  style={{ alignSelf: "center" }}
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
  navHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  weekGrid: {
    flexDirection: "row",
    gap: 4,
    justifyContent: "space-between",
  },
  weekDayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 1,
  },
  miniBadge: {
    width: 5,
    height: 5,
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
    padding: 18,
    gap: 12,
    maxHeight: "85%",
  },
  proposalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: radius.card,
    borderWidth: 1,
  },
});
