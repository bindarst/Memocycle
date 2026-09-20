import type { Course, Plan, ReviewEvent } from "../database/entities";
import { estimatePlanRetention } from "../review/fsrsScheduler";

const DAY = 86_400_000;

export function buildWeeklyReport(
  events: ReviewEvent[],
  courses: Course[],
  plans: Plan[],
  now = Date.now(),
) {
  const recent = events.filter((event) => new Date(event.completedAt).getTime() >= now - 7 * DAY);
  const previous = events.filter((event) => {
    const at = new Date(event.completedAt).getTime();
    return at >= now - 14 * DAY && at < now - 7 * DAY;
  });
  const minutes = recent.reduce(
    (sum, event) => sum + Math.max(1, Math.round((event.durationSeconds ?? 0) / 60) || courses.find((c) => c.id === event.courseId)?.estimatedReviewMinutes || 10),
    0,
  );
  const successful = recent.filter((event) => event.confidence === "good" || event.confidence === "easy").length;
  const active = plans.filter((plan) => plan.status === "active");
  const mastery = active.length
    ? Math.round(active.reduce((sum, plan) => sum + estimatePlanRetention(plan, now), 0) / active.length * 100)
    : 0;
  const delta = recent.length - previous.length;
  return {
    reviews: recent.length,
    minutes,
    successRate: recent.length ? Math.round(successful / recent.length * 100) : 0,
    mastery,
    delta,
    message: recent.length === 0
      ? "Une courte session suffit pour relancer ta semaine."
      : delta > 0
        ? `Tu as réalisé ${delta} activité${delta > 1 ? "s" : ""} de plus que la semaine passée.`
        : mastery >= 90
          ? "Ta mémoire est stable : maintiens ce rythme."
          : "Concentre la prochaine session sur les matières les plus fragiles.",
  };
}
