import type { Course, Exam, Plan } from "../database/entities";
import { estimatePlanRetention } from "../review/fsrsScheduler";

const DAY = 86_400_000;

export type ExamRescueMission = {
  course: Course;
  plan?: Plan;
  retention: number;
  minutes: number;
  reason: string;
};

export type ExamRescuePlan = {
  exam: Exam;
  daysLeft: number;
  dailyMinutes: number;
  readiness: number;
  phase: "Rattrapage" | "Apprentissage" | "Consolidation" | "Révision finale";
  missions: ExamRescueMission[];
};

export function buildExamRescuePlan(
  exam: Exam,
  courses: Course[],
  plans: Plan[],
  dailyMinutes = 30,
  now = Date.now(),
): ExamRescuePlan {
  const daysLeft = Math.max(0, Math.ceil((new Date(exam.examAt).getTime() - now) / DAY));
  const relevant = courses.filter(
    (course) =>
      course.subjectId === exam.subjectId &&
      !course.archivedAt &&
      !course.deletedAt,
  );
  const scored = relevant
    .map((course) => {
      const plan = plans.find((item) => item.courseId === course.id && item.status === "active");
      const retention = plan ? estimatePlanRetention(plan, now) : 0.35;
      return { course, plan, retention };
    })
    .sort((a, b) => a.retention - b.retention);
  const readiness = scored.length
    ? Math.round((scored.reduce((sum, item) => sum + item.retention, 0) / scored.length) * 100)
    : 0;
  const hasUnstarted = scored.some((item) => !item.plan);
  const phase = daysLeft <= 2
    ? "Révision finale"
    : hasUnstarted
      ? "Apprentissage"
      : readiness < 70
        ? "Rattrapage"
        : "Consolidation";
  let remaining = Math.max(10, dailyMinutes);
  const missions: ExamRescueMission[] = [];
  for (const item of scored) {
    const requested = item.course.estimatedReviewMinutes ?? 10;
    const minutes = Math.min(Math.max(5, requested), remaining);
    if (minutes < 5) break;
    missions.push({
      ...item,
      minutes,
      reason: !item.plan
        ? "Premier apprentissage"
        : item.retention < 0.7
          ? "Mémoire fragile"
          : item.retention < 0.9
            ? "À consolider"
            : "Entretien",
    });
    remaining -= minutes;
    if (remaining < 5) break;
  }
  return { exam, daysLeft, dailyMinutes, readiness, phase, missions };
}
