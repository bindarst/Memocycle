import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { endOfDay, format } from "date-fns";
import { fr } from "date-fns/locale";
import { StyleSheet, Text, View, Pressable } from "react-native";
import {
  Add01Icon,
  FireIcon,
  PlayIcon,
  GraduationCapIcon,
  Clock01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import {
  Screen,
  Card,
  Button,
  useEntities,
  usePalette,
  Pill,
  SectionTitle,
} from "../../src/ui/components";
import { AppIcon } from "../../src/ui/Icon";
import { CourseCard } from "../../src/ui/CourseCard";
import { MemoryCurve } from "../../src/ui/MemoryCurve";
import {
  courseSchema,
  planSchema,
  eventSchema,
  settingsSchema,
  type Course,
  type Plan,
  type Exam,
  type StudySession,
} from "../../src/database/entities";
import type { UnifiedCalendarEvent } from "@memocycle/contracts";
import { detectCalendarConflicts } from "../../src/calendar/calendarService";
import { fetchDeviceEvents } from "../../src/calendar/localCalendarService";
import { database } from "../../src/database/database";
import { currentSession } from "../../src/auth/authService";
import { useAuth } from "../../src/auth/AuthProvider";
import { dayKey, displayDate } from "../../src/utils/dates";
import { buildDailyPlan } from "../../src/planning/dailyPlanner";
import { calculateStreaks } from "../../src/utils/streak";

export default function Today() {
  const { state, userId } = useAuth();
  const c = usePalette();
  const rawCourses = useEntities("course");
  const rawPlans = useEntities("reviewPlan");
  const rawEvents = useEntities("reviewEvent");
  const rawExams = useEntities("exam");
  const rawSessions = useEntities("studySession");
  const rawSettings = useEntities("userSettings")[0];

  const courses = rawCourses.map((e) => courseSchema.parse(e)) as Course[];
  const plans = rawPlans.map((e) => planSchema.parse(e)) as Plan[];
  const events = rawEvents.map((e) => eventSchema.parse(e));
  const exams = rawExams as Exam[];
  const sessions = rawSessions as StudySession[];
  const settings = rawSettings ? settingsSchema.parse(rawSettings) : null;

  const [tick, setTick] = useState(Date.now());
  const [baseline, setBaseline] = useState(0);
  const [externalEvents, setExternalEvents] = useState<UnifiedCalendarEvent[]>([]);

  useEffect(() => {
    void fetchDeviceEvents(
      new Date(Date.now() - 86400000).toISOString(),
      new Date(Date.now() + 14 * 86400000).toISOString(),
    ).then(setExternalEvents);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const activePlans = plans.filter(
    (p) =>
      p.status === "active" &&
      p.nextReviewAt &&
      courses.some((course) => course.id === p.courseId && !course.archivedAt),
  );

  const duePlans = activePlans.filter(
    (p) => new Date(p.nextReviewAt!).getTime() <= tick,
  );

  const todaySessions = sessions.filter(
    (s) =>
      s.status === "planned" &&
      dayKey(new Date(s.plannedStartAt)) === dayKey(new Date(tick)),
  );

  const sessionMinutes = todaySessions.reduce((sum, s) => {
    const start = new Date(s.plannedStartAt).getTime();
    const end = new Date(s.plannedEndAt).getTime();
    return sum + Math.max(15, Math.round((end - start) / 60000));
  }, 0);

  const dailyPlanItems = buildDailyPlan(
    activePlans,
    courses,
    exams,
    settings?.dailyStudyMinutes ?? null,
    tick,
  );

  const streakStats = calculateStreaks(events, tick);

  const completedToday = events.filter(
    (e) =>
      e.kind === "review_completed" &&
      dayKey(new Date(e.completedAt)) === dayKey(new Date(tick)),
  ).length;

  const totalDueToday =
    activePlans.filter(
      (p) =>
        new Date(p.nextReviewAt!).getTime() <=
        endOfDay(new Date(tick)).getTime(),
    ).length + completedToday;

  useEffect(() => {
    void database().then(async (db) => {
      await db.runAsync(
        "INSERT INTO daily_progress(owner_user_id,day,initial_total) VALUES(?,?,?) ON CONFLICT(owner_user_id,day) DO UPDATE SET initial_total=MAX(initial_total,excluded.initial_total)",
        userId,
        dayKey(new Date(tick)),
        totalDueToday,
      );
      const r = await db.getFirstAsync<{ initial_total: number }>(
        "SELECT initial_total FROM daily_progress WHERE owner_user_id=? AND day=?",
        userId,
        dayKey(new Date(tick)),
      );
      setBaseline(r?.initial_total ?? totalDueToday);
    });
  }, [userId, totalDueToday, tick]);

  const totalEstimatedMinutes = duePlans.reduce((sum, p) => {
    const crs = courses.find((crsItem) => crsItem.id === p.courseId);
    return sum + (crs?.estimatedReviewMinutes ?? 10);
  }, 0);

  const totalPlannedMinutesToday = totalEstimatedMinutes + sessionMinutes;

  const conflictsToday = detectCalendarConflicts(
    [
      ...duePlans.map((p) => ({
        id: p.id,
        title: courses.find((c) => c.id === p.courseId)?.title ?? "Révision",
        type: "review" as const,
        startAt: String(p.nextReviewAt),
        endAt: new Date(new Date(String(p.nextReviewAt)).getTime() + 30 * 60000).toISOString(),
      })),
      ...todaySessions.map((s) => ({
        id: s.id,
        title: courses.find((c) => c.id === s.courseId)?.title ?? "Session d'étude",
        type: "study_session" as const,
        startAt: s.plannedStartAt,
        endAt: s.plannedEndAt,
      })),
    ],
    externalEvents,
  );

  const futureExams = exams
    .filter((e) => new Date(e.examAt).getTime() >= tick)
    .sort((a, b) => a.examAt.localeCompare(b.examAt));

  const nextExam = futureExams[0];
  const nextExamDaysLeft = nextExam
    ? Math.ceil((new Date(nextExam.examAt).getTime() - tick) / (24 * 3600000))
    : null;
  const nextExamCourse = nextExam
    ? courses.find((c) => (c.examIds ?? []).includes(nextExam.id))
    : null;

  const userName = currentSession()?.user.displayName
    ? currentSession()!.user.displayName!.split(" ")[0]
    : "";

  return (
    <Screen>
      {/* 1. Simple, clean header */}
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: c.textPrimary, letterSpacing: -0.4 }}>
            {userName ? `Bonjour ${userName}` : "Bonjour"}
          </Text>
          <Text style={{ fontSize: 13, color: c.textSecondary }}>
            {format(new Date(tick), "EEEE d MMMM", { locale: fr })}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {streakStats.currentStreak > 0 && (
            <View
              style={[
                styles.streakBadge,
                { backgroundColor: c.warningSoft, borderColor: c.warning },
              ]}
            >
              <AppIcon icon={FireIcon} size={14} color={c.warning} />
              <Text style={[styles.streakText, { color: c.warning }]}>
                {streakStats.currentStreak} j
              </Text>
            </View>
          )}

          {state === "offline_authenticated" && (
            <Pill tone="warning">Hors ligne</Pill>
          )}
        </View>
      </View>

      {/* 2. Compact Today Summary Card */}
      <Card style={{ padding: 14, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: c.textPrimary, letterSpacing: -0.2 }}>
              {duePlans.length} {duePlans.length > 1 ? "révisions" : "révision"}
            </Text>
            <Text style={{ fontSize: 13, color: c.textSecondary }}>
              ~{totalPlannedMinutesToday} min
              {settings?.dailyStudyMinutes ? ` · objectif ${settings.dailyStudyMinutes} min` : ""}
            </Text>
          </View>

          {duePlans.length > 0 && duePlans[0] && (
            <Button
              size="sm"
              variant="primary"
              title="Démarrer"
              icon={PlayIcon}
              onPress={() => router.push(`/session/${duePlans[0]!.courseId}`)}
            />
          )}
        </View>

        {baseline > 0 && (
          <View style={{ gap: 4 }}>
            <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
              <View
                style={{
                  height: 4,
                  width: `${Math.min(100, (completedToday / Math.max(1, baseline)) * 100)}%`,
                  backgroundColor: c.primary,
                  borderRadius: 4,
                }}
              />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 11, color: c.textSecondary }}>
                {completedToday} terminée{completedToday > 1 ? "s" : ""}
              </Text>
              <Text style={{ fontSize: 11, color: c.textSecondary }}>
                sur {baseline}
              </Text>
            </View>
          </View>
        )}

        {/* Inline contextual alerts (conflicts, next exam) */}
        {(conflictsToday.length > 0 || (nextExam && nextExamDaysLeft !== null)) && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingTop: 2 }}>
            {conflictsToday.length > 0 && (
              <Pressable
                onPress={() => router.push("/(tabs)/calendar")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: c.warningSoft,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <AppIcon icon={AlertCircleIcon} size={12} color={c.warning} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: c.warning }}>
                  {conflictsToday.length} conflit{conflictsToday.length > 1 ? "s" : ""}
                </Text>
              </Pressable>
            )}

            {nextExam && nextExamDaysLeft !== null && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: c.primarySoft,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <AppIcon icon={GraduationCapIcon} size={12} color={c.primary} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: c.primary }}>
                  {nextExamCourse?.title ?? nextExam.title} · J-{nextExamDaysLeft}
                </Text>
              </View>
            )}
          </View>
        )}
      </Card>

      <View style={styles.quickActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajouter un nouveau cours"
          onPress={() => router.push("/course/new")}
          style={[styles.quickAction, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: c.primarySoft }]}>
            <AppIcon icon={Add01Icon} size={18} color={c.primary} />
          </View>
          <Text style={[styles.quickActionTitle, { color: c.textPrimary }]}>Nouveau cours</Text>
          <Text style={[styles.quickActionCaption, { color: c.textSecondary }]}>Encoder rapidement</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir le planning"
          onPress={() => router.push("/(tabs)/calendar")}
          style={[styles.quickAction, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: c.warningSoft }]}>
            <AppIcon icon={Clock01Icon} size={18} color={c.warning} />
          </View>
          <Text style={[styles.quickActionTitle, { color: c.textPrimary }]}>Planifier</Text>
          <Text style={[styles.quickActionCaption, { color: c.textSecondary }]}>Organiser la semaine</Text>
        </Pressable>
      </View>

      {/* Planned Study Sessions */}
      {todaySessions.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionTitle title="Sessions d’étude aujourd’hui" />
          {todaySessions.map((sess) => {
            const course = courses.find((crs) => crs.id === sess.courseId);
            const start = new Date(sess.plannedStartAt);
            const timeStr = format(start, "HH:mm");
            return (
              <Card
                key={sess.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <AppIcon icon={Clock01Icon} size={13} color={c.primary} />
                    <Pill tone="primary">Session {timeStr}</Pill>
                  </View>
                  <Text style={{ fontWeight: "600", fontSize: 14, color: c.textPrimary }}>
                    {course?.title ?? "Session d'étude"}
                  </Text>
                </View>
                {course && (
                  <Button
                    size="sm"
                    variant="secondary"
                    title="Démarrer"
                    icon={PlayIcon}
                    onPress={() => router.push(`/session/${course.id}`)}
                  />
                )}
              </Card>
            );
          })}
        </View>
      )}

      {/* Memory Curve */}
      <MemoryCurve plans={plans} now={tick} />

      {/* Due Courses */}
      {!courses.length ? (
        <Card style={{ alignItems: "center", paddingVertical: 24, gap: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.textPrimary }}>Aucun cours enregistré</Text>
          <Button
            size="sm"
            icon={Add01Icon}
            title="Ajouter un cours"
            onPress={() => router.push("/(tabs)/library")}
          />
        </Card>
      ) : (
        <>
          <SectionTitle
            title="À réviser"
            action={
              <Button
                size="sm"
                variant="ghost"
                icon={Add01Icon}
                title="Cours"
                onPress={() => router.push("/(tabs)/library")}
              />
            }
          />
          {duePlans.length > 0 ? (
            duePlans.map((p) => (
              <CourseCard
                key={p.id}
                course={courses.find((item) => item.id === p.courseId)!}
                plan={p}
              />
            ))
          ) : (
            <Card style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
              <Text style={{ fontSize: 13, color: c.textSecondary }}>
                Toutes les révisions sont à jour.
              </Text>
            </Card>
          )}

          {/* Upcoming planned reviews */}
          {dailyPlanItems.filter((i) => !i.overdue && new Date(i.scheduledAt).getTime() > tick).length > 0 && (
            <>
              <SectionTitle title="À venir" />
              {dailyPlanItems
                .filter((i) => !i.overdue && new Date(i.scheduledAt).getTime() > tick)
                .slice(0, 4)
                .map((item) => {
                  const course = courses.find((itemCourse) => itemCourse.id === item.courseId);
                  const plan = plans.find((itemPlan) => itemPlan.id === item.reviewPlanId);
                  if (!course) return null;
                  return (
                    <CourseCard
                      key={item.reviewPlanId}
                      course={course}
                      plan={plan}
                    />
                  );
                })}
            </>
          )}
        </>
      )}

      {/* Upcoming Exams */}
      {futureExams.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionTitle title="Examens" />
          {futureExams.slice(0, 2).map((exam) => {
            const daysLeft = Math.ceil(
              (new Date(exam.examAt).getTime() - tick) / (24 * 3600000),
            );
            return (
              <Card
                key={exam.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: "600", fontSize: 14, color: c.textPrimary }}>
                    {exam.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: c.textSecondary }}>
                    {displayDate(exam.examAt)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Pill tone={daysLeft <= 7 ? "warning" : "primary"}>
                    {daysLeft <= 0 ? "Aujourd'hui" : `J-${daysLeft}`}
                  </Pill>
                  <AppIcon icon={GraduationCapIcon} size={18} color={c.warning} />
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  quickActions: { flexDirection: "row", gap: 10 },
  quickAction: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  quickActionIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: 3 },
  quickActionTitle: { fontSize: 13, fontWeight: "700" },
  quickActionCaption: { fontSize: 11, lineHeight: 15 },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  streakText: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressTrack: {
    height: 4,
    borderRadius: 4,
    overflow: "hidden",
  },
});
