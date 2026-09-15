import { useEffect, useState } from "react";
import { router } from "expo-router";
import { endOfDay, format } from "date-fns";
import { fr } from "date-fns/locale";
import { View } from "react-native";
import {
  Screen,
  Label,
  Card,
  Button,
  useEntities,
  usePalette,
} from "../../src/ui/components";
import { CourseCard } from "../../src/ui/CourseCard";
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
      <Label muted>{format(new Date(), "EEEE d MMMM", { locale: fr })}</Label>
      <Label large>
        Bonjour
        {currentSession()?.user.displayName
          ? ` ${currentSession()!.user.displayName!.split(" ")[0]}`
          : ""}
      </Label>
      {state === "offline_authenticated" && (
        <Label muted>Mode hors connexion</Label>
      )}
      {settings && !settings.remindersEnabled && (
        <Card>
          <Label>Les rappels sont désactivés</Label>
          <Button
            secondary
            title="Activer"
            onPress={() => router.push("/settings/notifications")}
          />
        </Card>
      )}
      <Card>
        <Label large>
          {due.length} révision{due.length > 1 ? "s" : ""}
        </Label>
        <Label muted>environ {minutes} min</Label>
        {baseline > 0 && (
          <>
            <Label>
              {completed} sur {Math.max(baseline, completed)} terminées
            </Label>
            <View
              style={{ height: 6, backgroundColor: c.border, borderRadius: 3 }}
            >
              <View
                style={{
                  height: 6,
                  width: `${Math.min(100, (completed / baseline) * 100)}%`,
                  backgroundColor: c.success,
                  borderRadius: 3,
                }}
              />
            </View>
          </>
        )}
      </Card>
      {!courses.length ? (
        <Card>
          <Label large>Ton planning est vide.</Label>
          <Label muted>
            Ajoute ton premier cours et MémoCycle organisera la suite.
          </Label>
          <Button
            title="Ajouter mon premier cours"
            onPress={() => router.push("/(tabs)/library")}
          />
        </Card>
      ) : (
        <>
          <Label large>
            {due.length ? "À réviser" : "Rien à réviser maintenant"}
          </Label>
          {due.map((p) => (
            <CourseCard
              key={p.id}
              course={courses.find((c) => c.id === p.courseId)!}
              plan={p}
            />
          ))}
          {!!later.length && <Label large>Ensuite</Label>}
          {later.slice(0, 3).map((p) => (
            <CourseCard
              key={p.id}
              course={courses.find((c) => c.id === p.courseId)!}
              plan={p}
            />
          ))}
        </>
      )}
      {!!exams.length && <Label large>Examens</Label>}
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
        title="Mes statistiques"
        onPress={() => router.push("/stats")}
      />
    </Screen>
  );
}
