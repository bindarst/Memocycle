import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { endOfDay, format } from "date-fns";
import { fr } from "date-fns/locale";
import { StyleSheet, Text, View, Pressable } from "react-native";
import {
  BarChart3,
  BellRing,
  BookOpenCheck,
  Plus,
  Flame,
  Calendar as CalendarIcon,
  Play,
  GraduationCap,
} from "lucide-react-native";
import {
  Screen,
  Label,
  Card,
  Button,
  useEntities,
  usePalette,
  Pill,
  SectionTitle,
} from "../../src/ui/components";
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
} from "../../src/database/entities";
import { database } from "../../src/database/database";
import { currentSession } from "../../src/auth/authService";
import { useAuth } from "../../src/auth/AuthProvider";
import { dayKey, displayDate } from "../../src/utils/dates";
import { buildDailyPlan, getAtRiskCourses } from "../../src/planning/dailyPlanner";
import { calculateStreaks } from "../../src/utils/streak";
import { radius } from "../../src/theme/tokens";

export default function Today() {
  const { state, userId } = useAuth();
  const c = usePalette();
  const rawCourses = useEntities("course");
  const rawPlans = useEntities("reviewPlan");
  const rawEvents = useEntities("reviewEvent");
  const rawExams = useEntities("exam");
  const rawSettings = useEntities("userSettings")[0];

  const courses = rawCourses.map((e) => courseSchema.parse(e)) as Course[];
  const plans = rawPlans.map((e) => planSchema.parse(e)) as Plan[];
  const events = rawEvents.map((e) => eventSchema.parse(e));
  const exams = rawExams as Exam[];
  const settings = rawSettings ? settingsSchema.parse(rawSettings) : null;

  const [tick, setTick] = useState(Date.now());
  const [baseline, setBaseline] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Active plans & due calculations
  const activePlans = plans.filter(
    (p) =>
      p.status === "active" &&
      p.nextReviewAt &&
      courses.some((course) => course.id === p.courseId && !course.archivedAt),
  );

  const duePlans = activePlans.filter(
    (p) => new Date(p.nextReviewAt!).getTime() <= tick,
  );

  // Daily plan from smart planner
  const dailyPlanItems = buildDailyPlan(
    activePlans,
    courses,
    exams,
    settings?.dailyStudyMinutes ?? null,
    tick,
  );

  // At-risk courses for retention consolidation
  const atRiskList = getAtRiskCourses(activePlans, courses, tick, 3);

  // Streaks
  const streakStats = calculateStreaks(events, tick);

  // Completed today & progress
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
    const crs = courses.find((c) => c.id === p.courseId);
    return sum + (crs?.estimatedReviewMinutes ?? 10);
  }, 0);

  const futureExams = exams
    .filter((e) => new Date(e.examAt).getTime() >= tick)
    .sort((a, b) => a.examAt.localeCompare(b.examAt));

  return (
    <Screen>
      {/* 1. Header & Salutation */}
      <View style={styles.topline}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.date, { color: c.primary }]}>
            JOURNÉE D’ÉTUDE • {format(new Date(tick), "d MMMM", { locale: fr }).toUpperCase()}
          </Text>
          <Label large>
            Bonjour
            {currentSession()?.user.displayName
              ? ` ${currentSession()!.user.displayName!.split(" ")[0]}`
              : ""}
          </Label>
        </View>

        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {streakStats.currentStreak > 0 && (
            <View
              style={[
                styles.streakBadge,
                { backgroundColor: c.warningSoft, borderColor: c.warning },
              ]}
            >
              <Flame size={16} color={c.warning} />
              <Text style={[styles.streakText, { color: c.warning }]}>
                {streakStats.currentStreak} j
              </Text>
            </View>
          )}

          {state === "offline_authenticated" ? (
            <Pill tone="warning">Hors ligne</Pill>
          ) : (
            <Pill tone="success">En ligne</Pill>
          )}
        </View>
      </View>

      {/* 2. Reminders Disabled Alert */}
      {settings && !settings.remindersEnabled && (
        <Card>
          <View style={styles.inlineTitle}>
            <BellRing color={c.warning} size={20} />
            <Label style={{ fontSize: 15, fontWeight: "600" }}>
              Les rappels de révision sont désactivés
            </Label>
          </View>
          <Button
            secondary
            title="Activer les rappels"
            onPress={() => router.push("/settings/notifications")}
          />
        </Card>
      )}

      {/* 3. Hero Dashboard: Due reviews, Estimated time & Progress */}
      <Card
        style={[
          styles.hero,
          { backgroundColor: c.primary, borderColor: c.primary },
        ]}
      >
        <View style={[styles.orb, { backgroundColor: c.accent }]} />
        <View style={styles.heroHeader}>
          <View style={[styles.heroIcon, { backgroundColor: c.accent }]}>
            <BookOpenCheck color={c.accentText} size={26} strokeWidth={2.4} />
          </View>
          <Text style={[styles.heroKicker, { color: c.onPrimary }]}>
            PROGRAMME DU JOUR
          </Text>
        </View>

        <View style={styles.heroCountRow}>
          <Text style={[styles.heroNumber, { color: c.onPrimary }]}>
            {duePlans.length}
          </Text>
          <View style={{ gap: 2, paddingBottom: 7 }}>
            <Text style={[styles.heroLabel, { color: c.onPrimary }]}>
              révision{duePlans.length > 1 ? "s" : ""} à faire
            </Text>
            <Text style={[styles.heroMeta, { color: c.onPrimary }]}>
              ~{totalEstimatedMinutes} min d'étude
              {settings?.dailyStudyMinutes
                ? ` • objectif ${settings.dailyStudyMinutes} min`
                : ""}
            </Text>
          </View>
        </View>

        {baseline > 0 && (
          <View style={{ gap: 6, marginTop: 4 }}>
            <Text style={[styles.progressLabel, { color: c.onPrimary }]}>
              {completedToday} sur {Math.max(baseline, completedToday)} révision(s) complétée(s) aujourd'hui
            </Text>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: `${c.onPrimary}33` },
              ]}
            >
              <View
                style={{
                  height: 8,
                  width: `${Math.min(100, (completedToday / Math.max(1, baseline)) * 100)}%`,
                  backgroundColor: c.accent,
                  borderRadius: 8,
                }}
              />
            </View>
          </View>
        )}

        {duePlans.length > 0 && duePlans[0] && (
          <View style={{ marginTop: 10 }}>
            <Button
              title="Commencer ma session"
              icon={Play}
              onPress={() => router.push(`/session/${duePlans[0]!.courseId}`)}
            />
          </View>
        )}
      </Card>

      {/* 4. Quick Action Buttons */}
      <View style={styles.quickActionsRow}>
        <Pressable
          onPress={() => router.push("/(tabs)/library")}
          style={[styles.quickActionBtn, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <Plus size={18} color={c.primary} />
          <Text style={[styles.quickActionText, { color: c.textPrimary }]}>Ajouter cours</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/calendar")}
          style={[styles.quickActionBtn, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <CalendarIcon size={18} color={c.primary} />
          <Text style={[styles.quickActionText, { color: c.textPrimary }]}>Voir agenda</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/stats")}
          style={[styles.quickActionBtn, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <BarChart3 size={18} color={c.primary} />
          <Text style={[styles.quickActionText, { color: c.textPrimary }]}>Statistiques</Text>
        </Pressable>
      </View>

      {/* 5. Memory Curve */}
      <MemoryCurve plans={plans} now={tick} />

      {/* 6. Section "À consolider" (At-risk courses, non-anxiety provoking) */}
      {atRiskList.length > 0 && (
        <View style={{ gap: 12 }}>
          <SectionTitle
            eyebrow="Consolidation"
            title="À consolider"
          />
          <Label muted style={{ fontSize: 14 }}>
            Ces notions méritent un rappel pour maintenir une rétention optimale :
          </Label>
          {atRiskList.map(({ course, retention }) => (
            <Card
              key={course.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <Pill tone="warning">
                    Mémoire : {Math.round(retention * 100)} %
                  </Pill>
                  <Text style={{ fontSize: 12, color: c.textSecondary }}>
                    ~{course.estimatedReviewMinutes || 10} min
                  </Text>
                </View>
                <Label style={{ fontWeight: "700", fontSize: 16 }}>
                  {course.title}
                </Label>
              </View>
              <Button
                secondary
                title="Session"
                icon={Play}
                onPress={() => router.push(`/session/${course.id}`)}
              />
            </Card>
          ))}
        </View>
      )}

      {/* 7. Focus: Due courses */}
      {!courses.length ? (
        <Card>
          <View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }]}>
            <Plus color={c.primary} size={30} />
          </View>
          <Label large>Crée ton premier cours.</Label>
          <Label muted>
            Ajoute ton premier cours et MémoCycle organisera automatiquement ta
            mémoire et tes révisions.
          </Label>
          <Button
            icon={Plus}
            title="Ajouter un cours"
            onPress={() => router.push("/(tabs)/library")}
          />
        </Card>
      ) : (
        <>
          <SectionTitle
            eyebrow="Aujourd'hui"
            title={duePlans.length ? "À réviser maintenant" : "Tout est à jour pour aujourd'hui"}
          />
          {duePlans.map((p) => (
            <CourseCard
              key={p.id}
              course={courses.find((c) => c.id === p.courseId)!}
              plan={p}
            />
          ))}

          {/* Intelligent Daily Plan - Upcoming */}
          {dailyPlanItems.filter((i) => !i.overdue && new Date(i.scheduledAt).getTime() > tick).length > 0 && (
            <>
              <SectionTitle eyebrow="Planificateur intelligent" title="Prochaines révisions planifiées" />
              {dailyPlanItems
                .filter((i) => !i.overdue && new Date(i.scheduledAt).getTime() > tick)
                .slice(0, 4)
                .map((item) => {
                  const course = courses.find((c) => c.id === item.courseId);
                  const plan = plans.find((p) => p.id === item.reviewPlanId);
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

      {/* 8. Upcoming Exams */}
      {futureExams.length > 0 && (
        <View style={{ gap: 12 }}>
          <SectionTitle eyebrow="Objectifs d'examen" title="Prochains examens" />
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
                }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <Pill tone={daysLeft <= 7 ? "warning" : "primary"}>
                      {daysLeft <= 0 ? "Aujourd'hui" : `Dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`}
                    </Pill>
                  </View>
                  <Label style={{ fontWeight: "700", fontSize: 16 }}>
                    {exam.title}
                  </Label>
                  <Label muted style={{ fontSize: 13 }}>
                    {displayDate(exam.examAt)}
                  </Label>
                </View>
                <GraduationCap size={28} color={c.warning} />
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  date: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  streakText: {
    fontSize: 13,
    fontWeight: "800",
  },
  inlineTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  hero: {
    minHeight: 205,
    overflow: "hidden",
    padding: 22,
    gap: 12,
  },
  orb: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    right: -44,
    top: -58,
    opacity: 0.18,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  heroKicker: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.35,
    opacity: 0.86,
  },
  heroCountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginTop: 2,
  },
  heroNumber: {
    fontSize: 56,
    lineHeight: 60,
    fontWeight: "900",
    letterSpacing: -2.5,
  },
  heroLabel: {
    fontSize: 19,
    fontWeight: "800",
  },
  heroMeta: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.88,
  },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
