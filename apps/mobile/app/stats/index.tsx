import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { subDays } from "date-fns";
import { StyleSheet, Text, View, Pressable } from "react-native";
import {
  ArrowLeft,
  Flame,
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
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
import {
  eventSchema,
  courseSchema,
  planSchema,
  type Course,
  type Plan,
  type Subject,
} from "../../src/database/entities";
import { dayKey } from "../../src/utils/dates";
import { MemoryCurve } from "../../src/ui/MemoryCurve";
import { estimatePlanRetention } from "../../src/review/fsrsScheduler";
import { calculateStreaks } from "../../src/utils/streak";
import { calculateDailyWorkloads } from "../../src/planning/workloadBalancer";
import { radius } from "../../src/theme/tokens";

type TimeRange = "7 jours" | "30 jours" | "90 jours" | "Tout";

export default function Stats() {
  const rawEvents = useEntities("reviewEvent");
  const rawCourses = useEntities("course");
  const rawPlans = useEntities("reviewPlan");
  const rawSubjects = useEntities("subject");

  const events = rawEvents.map((e) => eventSchema.parse(e));
  const courses = rawCourses.map((c) => courseSchema.parse(c)) as Course[];
  const plans = rawPlans.map((p) => planSchema.parse(p)) as Plan[];
  const subjects = rawSubjects as Subject[];

  const c = usePalette();
  const [tick, setTick] = useState(Date.now());
  const [timeRange, setTimeRange] = useState<TimeRange>("30 jours");

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const now = tick;
  const daysLimit =
    timeRange === "7 jours"
      ? 7
      : timeRange === "30 jours"
        ? 30
        : timeRange === "90 jours"
          ? 90
          : 3650;

  const rangeStart = subDays(new Date(now), daysLimit).getTime();

  const allReviews = events.filter((e) => e.kind === "review_completed");
  const filteredReviews = allReviews.filter(
    (e) => new Date(e.completedAt).getTime() >= rangeStart,
  );

  // Active plans & Retention
  const activePlans = plans.filter(
    (p) =>
      p.status === "active" &&
      courses.some((course) => course.id === p.courseId && !course.archivedAt),
  );

  const avgRetention = activePlans.length
    ? Math.round(
        (activePlans.reduce(
          (sum, p) => sum + estimatePlanRetention(p, now),
          0,
        ) /
          activePlans.length) *
          100,
      )
    : 0;

  // Rating breakdowns
  const successfulReviews = filteredReviews.filter(
    (e) => e.confidence === "good" || e.confidence === "easy",
  ).length;
  const hardReviews = filteredReviews.filter((e) => e.confidence === "hard").length;
  const againReviews = filteredReviews.filter((e) => e.confidence === "again").length;

  // Study times
  const sevenDaysAgo = subDays(new Date(now), 7).getTime();
  const thirtyDaysAgo = subDays(new Date(now), 30).getTime();

  const minutes7d = allReviews
    .filter((e) => new Date(e.completedAt).getTime() >= sevenDaysAgo)
    .reduce(
      (sum, e) =>
        sum +
        (courses.find((course) => course.id === e.courseId)
          ?.estimatedReviewMinutes ?? 10),
      0,
    );

  const minutes30d = allReviews
    .filter((e) => new Date(e.completedAt).getTime() >= thirtyDaysAgo)
    .reduce(
      (sum, e) =>
        sum +
        (courses.find((course) => course.id === e.courseId)
          ?.estimatedReviewMinutes ?? 10),
      0,
    );

  // Streaks
  const streaks = calculateStreaks(events, now);

  // 7-day workload forecast
  const workloads7d = calculateDailyWorkloads(
    activePlans,
    courses,
    [],
    7,
    now,
  );
  const totalForecastReviews = workloads7d.reduce(
    (sum, w) => sum + w.plans.length,
    0,
  );
  const totalForecastMinutes = workloads7d.reduce(
    (sum, w) => sum + w.estimatedMinutes,
    0,
  );

  // Average stability
  const fsrsPlans = activePlans.filter(
    (p) => p.schedulerType === "fsrs" && p.stability,
  );
  const avgStability = fsrsPlans.length
    ? (
        fsrsPlans.reduce((sum, p) => sum + (p.stability || 0), 0) /
        fsrsPlans.length
      ).toFixed(1)
    : null;

  // Fragile subjects (lowest average retention)
  const subjectStats = subjects
    .map((s) => {
      const subjectCourses = courses.filter(
        (crs) => crs.subjectId === s.id && !crs.archivedAt,
      );
      const subjectPlans = activePlans.filter((p) =>
        subjectCourses.some((crs) => crs.id === p.courseId),
      );
      const ret = subjectPlans.length
        ? subjectPlans.reduce(
            (sum, p) => sum + estimatePlanRetention(p, now),
            0,
          ) / subjectPlans.length
        : 1;
      return {
        subject: s,
        courseCount: subjectCourses.length,
        retention: Math.round(ret * 100),
      };
    })
    .filter((item) => item.courseCount > 0)
    .sort((a, b) => a.retention - b.retention);

  // Most difficult courses (high lapses or high difficulty or rating 'again')
  const difficultCourses = activePlans
    .map((p) => {
      const course = courses.find((c) => c.id === p.courseId);
      const lapses = p.lapses || 0;
      const difficulty = p.difficulty || 5;
      return {
        course,
        plan: p,
        score: lapses * 3 + difficulty,
        lapses,
        difficulty: Number(difficulty.toFixed(1)),
      };
    })
    .filter((item) => item.course)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <Screen>
      <Button
        secondary
        icon={ArrowLeft}
        title="Retour"
        onPress={() => router.back()}
      />

      <SectionTitle eyebrow="Statistiques" title="Bilan d'apprentissage" />

      {/* Time Range Selector */}
      <View style={styles.rangeRow}>
        {(["7 jours", "30 jours", "90 jours", "Tout"] as TimeRange[]).map(
          (range) => (
            <Pressable
              key={range}
              onPress={() => setTimeRange(range)}
              style={[
                styles.rangeChip,
                {
                  backgroundColor:
                    timeRange === range ? c.primary : c.surface,
                  borderColor:
                    timeRange === range ? c.primary : c.border,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color:
                    timeRange === range ? c.onPrimary : c.textPrimary,
                }}
              >
                {range}
              </Text>
            </Pressable>
          ),
        )}
      </View>

      {/* Main Metric Cards */}
      <View style={styles.metricsGrid}>
        <Card style={styles.metricCard}>
          <View
            style={[styles.metricIcon, { backgroundColor: c.primarySoft }]}
          >
            <BrainCircuit color={c.primary} size={20} />
          </View>
          <Text style={[styles.metricValue, { color: c.textPrimary }]}>
            {avgRetention}%
          </Text>
          <Text style={[styles.metricLabel, { color: c.textSecondary }]}>
            Rétention moyenne
          </Text>
        </Card>

        <Card style={styles.metricCard}>
          <View
            style={[styles.metricIcon, { backgroundColor: c.warningSoft }]}
          >
            <Flame color={c.warning} size={20} />
          </View>
          <Text style={[styles.metricValue, { color: c.textPrimary }]}>
            {streaks.currentStreak} j
          </Text>
          <Text style={[styles.metricLabel, { color: c.textSecondary }]}>
            Série active (max {streaks.longestStreak} j)
          </Text>
        </Card>

        <Card style={styles.metricCard}>
          <View
            style={[styles.metricIcon, { backgroundColor: c.successSoft }]}
          >
            <CheckCircle2 color={c.success} size={20} />
          </View>
          <Text style={[styles.metricValue, { color: c.textPrimary }]}>
            {successfulReviews}
          </Text>
          <Text style={[styles.metricLabel, { color: c.textSecondary }]}>
            Réussies (Bien / Facile)
          </Text>
        </Card>

        <Card style={styles.metricCard}>
          <View
            style={[styles.metricIcon, { backgroundColor: c.dangerSoft }]}
          >
            <AlertTriangle color={c.danger} size={20} />
          </View>
          <Text style={[styles.metricValue, { color: c.textPrimary }]}>
            {againReviews}
          </Text>
          <Text style={[styles.metricLabel, { color: c.textSecondary }]}>
            Oublis ({hardReviews} difficiles)
          </Text>
        </Card>
      </View>

      {/* Time Studied & Forecast */}
      <Card style={{ gap: 12 }}>
        <SectionTitle eyebrow="Investissement" title="Temps d'étude & Charge" />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 13, color: c.textSecondary }}>7 derniers jours</Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: c.textPrimary }}>
              ~{minutes7d} min
            </Text>
          </View>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 13, color: c.textSecondary }}>30 derniers jours</Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: c.textPrimary }}>
              ~{minutes30d} min
            </Text>
          </View>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 13, color: c.textSecondary }}>Charge 7j à venir</Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: c.primary }}>
              {totalForecastReviews} révisions (~{totalForecastMinutes}m)
            </Text>
          </View>
        </View>

        {avgStability && (
          <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: 4 }}>
            Stabilité moyenne mémoire : {avgStability} jours
          </Text>
        )}
      </Card>

      {/* Memory Curve */}
      <MemoryCurve plans={plans} now={tick} />

      {/* Fragile subjects & Difficult courses */}
      {subjectStats.length > 0 && (
        <View style={{ gap: 10 }}>
          <SectionTitle
            eyebrow="Points d'attention"
            title="Matières & Rétention"
          />
          {subjectStats.map((item) => (
            <Card
              key={item.subject.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: c.textPrimary }}>
                  {item.subject.title}
                </Text>
                <Text style={{ fontSize: 13, color: c.textSecondary }}>
                  {item.courseCount} cours actifs
                </Text>
              </View>
              <Pill tone={item.retention >= 90 ? "success" : "warning"}>
                {item.retention}% mémoire
              </Pill>
            </Card>
          ))}
        </View>
      )}

      {difficultCourses.length > 0 && (
        <View style={{ gap: 10 }}>
          <SectionTitle
            eyebrow="Complexité"
            title="Notions demandant le plus de rappels"
          />
          {difficultCourses.map(({ course, lapses, difficulty }) => (
            <Card key={course!.id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: c.textPrimary, flex: 1 }}>
                  {course!.title}
                </Text>
                <Pill tone={lapses > 0 ? "warning" : "primary"}>
                  {lapses} oubli{lapses > 1 ? "s" : ""}
                </Pill>
              </View>
              <Text style={{ fontSize: 13, color: c.textSecondary }}>
                Difficulté ressentie : {difficulty} / 10
              </Text>
            </Card>
          ))}
        </View>
      )}

      {/* 90-day Activity Heatmap */}
      <SectionTitle eyebrow="Régularité" title="Activité d'apprentissage" />
      <Card>
        <View style={styles.heatmap}>
          {Array.from({ length: 90 }, (_, i) => {
            const day = dayKey(subDays(new Date(), 89 - i));
            const n = events.filter(
              (e) => dayKey(new Date(e.completedAt)) === day,
            ).length;
            return (
              <View
                key={day}
                accessible
                accessibilityLabel={`${day} : ${n} activités`}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 5,
                  backgroundColor:
                    n > 2
                      ? c.primary
                      : n
                        ? c.accent
                        : c.surfaceMuted,
                }}
              />
            );
          })}
        </View>
        <View style={styles.legend}>
          <Label muted>Calme</Label>
          <View style={[styles.dot, { backgroundColor: c.surfaceMuted }]} />
          <View style={[styles.dot, { backgroundColor: c.accent }]} />
          <View style={[styles.dot, { backgroundColor: c.primary }]} />
          <Label muted>Intense</Label>
        </View>
      </Card>

      <Text style={[styles.disclaimer, { color: c.textSecondary }]}>
        Ces indicateurs sont des estimations calculées par le modèle FSRS pour
        guider tes révisions. Ils ne constituent pas une mesure neurologique ou
        médicale.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rangeRow: {
    flexDirection: "row",
    gap: 8,
  },
  rangeChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    minHeight: 128,
    flexGrow: 1,
    gap: 6,
    padding: 16,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  heatmap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
