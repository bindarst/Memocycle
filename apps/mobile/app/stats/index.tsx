import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { subDays } from "date-fns";
import { StyleSheet, Text, View } from "react-native";
import {
  ArrowLeft01Icon,
  FireIcon,
  AiBrain01Icon,
  AlertCircleIcon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons";
import {
  Screen,
  Label,
  Card,
  IconButton,
  SegmentedControl,
  useEntities,
  usePalette,
  Pill,
  SectionTitle,
} from "../../src/ui/components";
import { AppIcon } from "../../src/ui/Icon";
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

type TimeRange = "7 j" | "30 j" | "90 j" | "Tout";

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
  const [timeRange, setTimeRange] = useState<TimeRange>("30 j");

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const now = tick;
  const daysLimit =
    timeRange === "7 j"
      ? 7
      : timeRange === "30 j"
      ? 30
      : timeRange === "90 j"
      ? 90
      : 3650;

  const rangeStart = subDays(new Date(now), daysLimit).getTime();

  const allReviews = events.filter((e) => e.kind === "review_completed");
  const filteredReviews = allReviews.filter(
    (e) => new Date(e.completedAt).getTime() >= rangeStart,
  );

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

  const successfulReviews = filteredReviews.filter(
    (e) => e.confidence === "good" || e.confidence === "easy",
  ).length;
  const hardReviews = filteredReviews.filter((e) => e.confidence === "hard").length;
  const againReviews = filteredReviews.filter((e) => e.confidence === "again").length;

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

  const streaks = calculateStreaks(events, now);

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

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton
          icon={ArrowLeft01Icon}
          accessibilityLabel="Retour"
          onPress={() => router.back()}
        />
        <Label large>Progression</Label>
      </View>

      {/* Time Range Selector */}
      <SegmentedControl
        options={[
          { label: "7 jours", value: "7 j" },
          { label: "30 jours", value: "30 j" },
          { label: "90 jours", value: "90 j" },
          { label: "Tout", value: "Tout" },
        ]}
        value={timeRange}
        onChange={(v) => setTimeRange(v as TimeRange)}
      />

      {/* Main Metric Cards */}
      <View style={styles.metricsGrid}>
        <Card style={styles.metricCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <AppIcon icon={AiBrain01Icon} color={c.primary} size={16} />
            <Text style={[styles.metricLabel, { color: c.textSecondary }]}>
              Rétention
            </Text>
          </View>
          <Text style={[styles.metricValue, { color: c.textPrimary }]}>
            {avgRetention}%
          </Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <AppIcon icon={FireIcon} color={c.warning} size={16} />
            <Text style={[styles.metricLabel, { color: c.textSecondary }]}>
              Série
            </Text>
          </View>
          <Text style={[styles.metricValue, { color: c.textPrimary }]}>
            {streaks.currentStreak} j
          </Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <AppIcon icon={CheckmarkCircle01Icon} color={c.success} size={16} />
            <Text style={[styles.metricLabel, { color: c.textSecondary }]}>
              Réussies
            </Text>
          </View>
          <Text style={[styles.metricValue, { color: c.textPrimary }]}>
            {successfulReviews}
          </Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <AppIcon icon={AlertCircleIcon} color={c.danger} size={16} />
            <Text style={[styles.metricLabel, { color: c.textSecondary }]}>
              Oublis
            </Text>
          </View>
          <Text style={[styles.metricValue, { color: c.textPrimary }]}>
            {againReviews}
            {hardReviews > 0 ? (
              <Text style={{ fontSize: 13, fontWeight: "500", color: c.textSecondary }}>
                {" "}(+{hardReviews})
              </Text>
            ) : null}
          </Text>
        </Card>
      </View>

      {/* Time Studied & Forecast */}
      <Card style={{ padding: 14, gap: 10 }}>
        <SectionTitle title="Temps d’étude" />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 12, color: c.textSecondary }}>7 jours</Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.textPrimary }}>
              ~{minutes7d} min
            </Text>
          </View>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 12, color: c.textSecondary }}>30 jours</Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.textPrimary }}>
              ~{minutes30d} min
            </Text>
          </View>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 12, color: c.textSecondary }}>Charge 7j</Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.primary }}>
              {totalForecastReviews} rév. (~{totalForecastMinutes}m)
            </Text>
          </View>
        </View>
      </Card>

      {/* Memory Curve */}
      <MemoryCurve plans={plans} now={tick} />

      {/* Subjects retention */}
      {subjectStats.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionTitle title="Matières" />
          {subjectStats.map((item) => (
            <Card
              key={item.subject.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: c.textPrimary }}>
                  {item.subject.title}
                </Text>
                <Text style={{ fontSize: 12, color: c.textSecondary }}>
                  {item.courseCount} cours
                </Text>
              </View>
              <Pill tone={item.retention >= 90 ? "success" : "warning"}>
                {item.retention}%
              </Pill>
            </Card>
          ))}
        </View>
      )}

      {/* 90-day Activity Heatmap */}
      <View style={{ gap: 8 }}>
        <SectionTitle title="90 derniers jours" />
        <Card style={{ padding: 14 }}>
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
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    backgroundColor:
                      n > 2
                        ? c.primary
                        : n
                        ? c.primarySoft
                        : c.surfaceMuted,
                  }}
                />
              );
            })}
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCard: {
    width: "48%",
    minHeight: 80,
    flexGrow: 1,
    gap: 4,
    padding: 12,
    justifyContent: "center",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  heatmap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
});

