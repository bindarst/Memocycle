import { endOfDay, startOfDay } from "date-fns";
import type { Course, Plan, Exam } from "../database/entities";
import { estimatePlanRetention } from "../review/fsrsScheduler";

export type DailyPlanReason = "overdue" | "memory_risk" | "exam_soon" | "scheduled";

export interface DailyPlanItem {
  courseId: string;
  reviewPlanId: string;
  reason: DailyPlanReason;
  estimatedMinutes: number;
  priorityScore: number;
  scheduledAt: string;
  overdue: boolean;
}

export function buildDailyPlan(
  plans: Plan[],
  courses: Course[],
  exams: Exam[] = [],
  dailyStudyMinutes: number | null = null,
  now = Date.now(),
): DailyPlanItem[] {
  const activePlans = plans.filter((p) => {
    if (p.status !== "active" || !p.nextReviewAt) return false;
    const course = courses.find((c) => c.id === p.courseId);
    return course && !course.archivedAt && !course.deletedAt;
  });

  const todayEnd = endOfDay(new Date(now)).getTime();
  const futureExams = exams.filter(
    (e) => new Date(e.examAt).getTime() >= startOfDay(new Date(now)).getTime(),
  );

  const items: DailyPlanItem[] = activePlans.map((plan) => {
    const course = courses.find((c) => c.id === plan.courseId)!;
    const scheduledTime = new Date(plan.nextReviewAt!).getTime();
    const isOverdue = scheduledTime < now;
    const isDueToday = scheduledTime <= todayEnd;
    const estimatedMinutes = course.estimatedReviewMinutes || 10;
    const retention = estimatePlanRetention(plan, now);
    const importance = course.importance || 2;

    // Examens associés à la matière ou au module
    const relevantExams = futureExams.filter(
      (e) => e.subjectId === course.subjectId,
    );
    let examBoost = 0;
    let daysUntilClosestExam = Infinity;

    if (relevantExams.length > 0) {
      const closestExamTime = Math.min(
        ...relevantExams.map((e) => new Date(e.examAt).getTime()),
      );
      daysUntilClosestExam = Math.max(
        0,
        (closestExamTime - now) / (24 * 3600000),
      );
      if (daysUntilClosestExam <= 30) {
        // Boost exponentiel / progressif selon la proximité de l'examen
        examBoost = Math.max(0, (30 - daysUntilClosestExam) * 4);
      }
    }

    const memoryRiskBoost = retention < 0.9 ? (0.9 - retention) * 200 : 0;

    let reason: DailyPlanReason = "scheduled";
    if (isOverdue) {
      reason = "overdue";
    } else if (daysUntilClosestExam <= 14) {
      reason = "exam_soon";
    } else if (retention < 0.88) {
      reason = "memory_risk";
    }

    // Calcul du score de priorité
    let priorityScore = 0;
    if (isOverdue) {
      const overdueHours = (now - scheduledTime) / 3600000;
      priorityScore = 1000 + overdueHours * 2;
    } else if (isDueToday) {
      priorityScore = 500;
    } else {
      const daysUntilScheduled = (scheduledTime - now) / (24 * 3600000);
      priorityScore = Math.max(0, 100 - daysUntilScheduled * 5);
    }

    priorityScore += importance * 25 + examBoost + memoryRiskBoost;

    return {
      courseId: course.id,
      reviewPlanId: plan.id,
      reason,
      estimatedMinutes,
      priorityScore: Math.round(priorityScore),
      scheduledAt: plan.nextReviewAt!,
      overdue: isOverdue,
    };
  });

  // Tri par priorité décroissante
  items.sort((a, b) => b.priorityScore - a.priorityScore);

  // Respect du temps quotidien sans jamais masquer les révisions échues
  if (!dailyStudyMinutes) {
    return items;
  }

  let accumulatedMinutes = 0;
  const filteredPlan: DailyPlanItem[] = [];

  for (const item of items) {
    const isDue = new Date(item.scheduledAt).getTime() <= todayEnd;
    if (isDue) {
      // Les révisions déjà échues ou dues aujourd'hui ne sont jamais masquées
      filteredPlan.push(item);
      accumulatedMinutes += item.estimatedMinutes;
    } else if (accumulatedMinutes + item.estimatedMinutes <= dailyStudyMinutes) {
      // Ajout de révisions préventives (examens ou risque mémoire) si le temps le permet
      filteredPlan.push(item);
      accumulatedMinutes += item.estimatedMinutes;
    }
  }

  return filteredPlan;
}

export function getAtRiskCourses(
  plans: Plan[],
  courses: Course[],
  now = Date.now(),
  limit = 3,
): { plan: Plan; course: Course; retention: number }[] {
  const activePlans = plans.filter((p) => {
    if (p.status !== "active" || !p.nextReviewAt) return false;
    const course = courses.find((c) => c.id === p.courseId);
    return course && !course.archivedAt && !course.deletedAt;
  });

  const scored = activePlans
    .map((plan) => {
      const course = courses.find((c) => c.id === plan.courseId)!;
      const retention = estimatePlanRetention(plan, now);
      return { plan, course, retention };
    })
    .filter((item) => item.retention < 0.9)
    .sort((a, b) => a.retention - b.retention);

  return scored.slice(0, limit);
}
