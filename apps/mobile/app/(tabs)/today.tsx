import { useEffect, useState } from "react";
import { router } from "expo-router";
import { endOfDay, format } from "date-fns";
import { fr } from "date-fns/locale";
import { StyleSheet, Text, View } from "react-native";
import { BarChart3, BellRing, BookOpenCheck, Plus } from "lucide-react-native";
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
} from "../../src/database/entities";
import { database } from "../../src/database/database";
import { currentSession } from "../../src/auth/authService";
import { useAuth } from "../../src/auth/AuthProvider";
import { dayKey, displayDate } from "../../src/utils/dates";
export default function Today() {
  const { state, userId } = useAuth();
  const c = usePalette();
  const courses = useEntities("course").map((e) => courseSchema.parse(e));
  const plans = useEntities("reviewPlan").map((e) => planSchema.parse(e));
  const events = useEntities("reviewEvent").map((e) => eventSchema.parse(e));
  const [tick, setTick] = useState(Date.now());
  const exams = useEntities("exam")
    .filter((exam) => new Date(String(exam.examAt)).getTime() >= tick)
    .sort((a, b) => String(a.examAt).localeCompare(String(b.examAt)));
  const rawSettings = useEntities("userSettings")[0];
  const settings = rawSettings ? settingsSchema.parse(rawSettings) : null;
  const [baseline, setBaseline] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const active = plans
    .filter(
      (p) =>
        p.status === "active" &&
        p.nextReviewAt &&
        courses.some((c) => c.id === p.courseId && !c.archivedAt),
    )
    .sort((a, b) => a.nextReviewAt!.localeCompare(b.nextReviewAt!));
  const due = active.filter((p) => new Date(p.nextReviewAt!).getTime() <= tick);
  const later = active.filter(
    (p) => new Date(p.nextReviewAt!).getTime() > tick,
  );
  const completed = events.filter(
    (e) =>
      e.kind === "review_completed" &&
      dayKey(new Date(e.completedAt)) === dayKey(),
  ).length;
  const total =
    active.filter(
      (p) =>
        new Date(p.nextReviewAt!).getTime() <= endOfDay(new Date()).getTime(),
    ).length + completed;
  useEffect(() => {
    void database().then(async (db) => {
      await db.runAsync(
        "INSERT INTO daily_progress(owner_user_id,day,initial_total) VALUES(?,?,?) ON CONFLICT(owner_user_id,day) DO UPDATE SET initial_total=MAX(initial_total,excluded.initial_total)",
        userId,
        dayKey(),
        total,
      );
      const r = await db.getFirstAsync<{ initial_total: number }>(
        "SELECT initial_total FROM daily_progress WHERE owner_user_id=? AND day=?",
        userId,
        dayKey(),
      );
      setBaseline(r?.initial_total ?? total);
    });
  }, [userId, total]);
  const minutes = due.reduce(
    (sum, p) =>
      sum +
      (courses.find((c) => c.id === p.courseId)?.estimatedReviewMinutes ?? 0),
    0,
  );
  return (
    <Screen>
      <View style={styles.topline}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={[styles.date, { color: c.primary }]}>JOURNÉE D’ÉTUDE</Text>
          <Label large>
            Bonjour
            {currentSession()?.user.displayName
              ? ` ${currentSession()!.user.displayName!.split(" ")[0]}`
              : ""}
          </Label>
        </View>
        {state === "offline_authenticated" ? <Pill tone="warning">Hors ligne</Pill> : <Pill tone="success">Synchronisé</Pill>}
      </View>
      <Label muted>{format(new Date(), "EEEE d MMMM", { locale: fr })}</Label>
      {settings && !settings.remindersEnabled && (
        <Card>
          <View style={styles.inlineTitle}>
            <BellRing color={c.warning} size={21} />
            <Label>Les rappels sont désactivés</Label>
          </View>
          <Button
            secondary
            icon={BellRing}
            title="Activer"
            onPress={() => router.push("/settings/notifications")}
          />
        </Card>
      )}
      <Card style={[styles.hero, { backgroundColor: c.primary, borderColor: c.primary }]}>
        <View style={[styles.orb, { backgroundColor: c.accent }]} />
        <View style={styles.heroHeader}>
          <View style={[styles.heroIcon, { backgroundColor: c.accent }]}>
            <BookOpenCheck color={c.accentText} size={26} strokeWidth={2.4} />
          </View>
          <Text style={[styles.heroKicker, { color: c.onPrimary }]}>SESSION DU JOUR</Text>
        </View>
        <View style={styles.heroCountRow}>
          <Text style={[styles.heroNumber, { color: c.onPrimary }]}>{due.length}</Text>
          <View style={{ gap: 2, paddingBottom: 7 }}>
            <Text style={[styles.heroLabel, { color: c.onPrimary }]}>révision{due.length > 1 ? "s" : ""}</Text>
            <Text style={[styles.heroMeta, { color: c.onPrimary }]}>environ {minutes} min</Text>
          </View>
        </View>
        {baseline > 0 && (
          <>
            <Text style={[styles.progressLabel, { color: c.onPrimary }]}>
              {completed} sur {Math.max(baseline, completed)} terminées
            </Text>
            <View
              style={[styles.progressTrack, { backgroundColor: `${c.onPrimary}33` }]}
            >
              <View
                style={{
                  height: 8,
                  width: `${Math.min(100, (completed / baseline) * 100)}%`,
                  backgroundColor: c.accent,
                  borderRadius: 8,
                }}
              />
            </View>
          </>
        )}
      </Card>

      <MemoryCurve plans={plans} now={tick} />

      {!courses.length ? (
        <Card>
          <View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }]}>
            <Plus color={c.primary} size={30} />
          </View>
          <Label large>Crée ton premier cycle.</Label>
          <Label muted>
            Ajoute ton premier cours et MémoCycle organisera la suite.
          </Label>
          <Button
            icon={Plus}
            title="Ajouter mon premier cours"
            onPress={() => router.push("/(tabs)/library")}
          />
        </Card>
      ) : (
        <>
          <SectionTitle
            eyebrow="Focus"
            title={due.length ? "À réviser maintenant" : "Tout est à jour"}
          />
          {due.map((p) => (
            <CourseCard
              key={p.id}
              course={courses.find((c) => c.id === p.courseId)!}
              plan={p}
            />
          ))}
          {!!later.length && <SectionTitle eyebrow="À venir" title="Ensuite" />}
          {later.slice(0, 3).map((p) => (
            <CourseCard
              key={p.id}
              course={courses.find((c) => c.id === p.courseId)!}
              plan={p}
            />
          ))}
        </>
      )}
      {!!exams.length && <SectionTitle eyebrow="Objectifs" title="Examens" />}
      {exams.slice(0, 3).map((exam) => {
        const subjectCourses = courses.filter(
          (course) => course.subjectId === exam.subjectId,
        );
        return (
          <Card key={exam.id}>
            <Label>{String(exam.title)}</Label>
            <Label muted>{displayDate(String(exam.examAt))}</Label>
            {!subjectCourses.some((course) => course.studiedAt) && (
              <Label muted>
                Aucun cours de cette matière n’a encore été étudié.
              </Label>
            )}
          </Card>
        );
      })}
      <Button
        secondary
        icon={BarChart3}
        title="Mes statistiques"
        onPress={() => router.push("/stats")}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topline: { flexDirection: "row", alignItems: "center", gap: 12 },
  date: { fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  inlineTitle: { flexDirection: "row", alignItems: "center", gap: 10 },
  hero: { minHeight: 205, overflow: "hidden", padding: 22 },
  orb: { position: "absolute", width: 150, height: 150, borderRadius: 75, right: -44, top: -58, opacity: 0.18 },
  heroHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  heroIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  heroKicker: { fontSize: 12, fontWeight: "900", letterSpacing: 1.35, opacity: 0.86 },
  heroCountRow: { flexDirection: "row", alignItems: "flex-end", gap: 12, marginTop: 3 },
  heroNumber: { fontSize: 58, lineHeight: 62, fontWeight: "900", letterSpacing: -2.5 },
  heroLabel: { fontSize: 19, fontWeight: "800" },
  heroMeta: { fontSize: 13, fontWeight: "600", opacity: 0.72 },
  progressLabel: { fontSize: 13, fontWeight: "700", opacity: 0.86 },
  progressTrack: { height: 8, borderRadius: 8, overflow: "hidden" },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
