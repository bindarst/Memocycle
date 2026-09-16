import { addDays, format, startOfDay } from "date-fns";
import type { Course, Plan, Exam } from "../database/entities";
import { estimatePlanRetention } from "../review/fsrsScheduler";

export type WorkloadImpact = "Peu d’impact" | "Impact modéré" | "Déconseillé";

export interface PostponeResult {
  newDate: Date;
  impact: WorkloadImpact;
  estimatedRetention: number;
}

export function postponeReview(
  plan: Plan,
  daysToPostpone: number,
  now = Date.now(),
): PostponeResult {
  if (!plan.nextReviewAt) {
    const newDate = addDays(new Date(now), Math.max(1, daysToPostpone));
    return { newDate, impact: "Peu d’impact", estimatedRetention: 1 };
  }

  const currentDate = new Date(plan.nextReviewAt);
  const newDate = addDays(currentDate, Math.max(1, daysToPostpone));
  const retention = estimatePlanRetention(plan, newDate.getTime());

  let impact: WorkloadImpact = "Peu d’impact";
  if (retention < 0.8) {
    impact = "Déconseillé";
  } else if (retention < 0.88) {
    impact = "Impact modéré";
  }

  return {
    newDate,
    impact,
    estimatedRetention: Number(retention.toFixed(4)),
  };
}

export function advanceReview(
  plan: Plan,
  daysToAdvance: number,
  now = Date.now(),
): PostponeResult {
  if (!plan.nextReviewAt) {
    const newDate = new Date(now);
    return { newDate, impact: "Peu d’impact", estimatedRetention: 1 };
  }

  const currentDate = new Date(plan.nextReviewAt);
  const newDate = addDays(currentDate, -Math.max(1, daysToAdvance));
  // Ne pas avancer dans le passé
  const boundedDate = new Date(Math.max(now, newDate.getTime()));
  const retention = estimatePlanRetention(plan, boundedDate.getTime());

  const totalIntervalDays =
    (currentDate.getTime() -
      new Date(plan.lastReviewedAt ?? plan.startedAt).getTime()) /
    (24 * 3600000);

  let impact: WorkloadImpact = "Peu d’impact";
  if (daysToAdvance > totalIntervalDays * 0.5 && totalIntervalDays > 3) {
    impact = "Impact modéré";
  }

  return {
    newDate: boundedDate,
    impact,
    estimatedRetention: Number(retention.toFixed(4)),
  };
}

export interface DayWorkload {
  day: string;
  date: Date;
  plans: Plan[];
  estimatedMinutes: number;
  hasExam: boolean;
}

export function calculateDailyWorkloads(
  plans: Plan[],
  courses: Course[],
  exams: Exam[] = [],
  horizonDays = 14,
  now = Date.now(),
): DayWorkload[] {
  const workloads: DayWorkload[] = [];
  const baseDate = startOfDay(new Date(now));

  for (let i = 0; i < horizonDays; i++) {
    const d = addDays(baseDate, i);
    const dayKey = format(d, "yyyy-MM-dd");
    const dStart = startOfDay(d).getTime();
    const dEnd = dStart + 24 * 3600000;

    const dayPlans = plans.filter((p) => {
      if (p.status !== "active" || !p.nextReviewAt) return false;
      const t = new Date(p.nextReviewAt).getTime();
      return t >= dStart && t < dEnd;
    });

    const estimatedMinutes = dayPlans.reduce((sum, p) => {
      const course = courses.find((c) => c.id === p.courseId);
      return sum + (course?.estimatedReviewMinutes ?? 10);
    }, 0);

    const hasExam = exams.some((e) => {
      const t = new Date(e.examAt).getTime();
      return t >= dStart && t < dEnd;
    });

    workloads.push({
      day: dayKey,
      date: d,
      plans: dayPlans,
      estimatedMinutes,
      hasExam,
    });
  }

  return workloads;
}

export interface WorkloadRebalanceProposal {
  planId: string;
  courseTitle: string;
  originalDate: string;
  proposedDate: string;
  impact: WorkloadImpact;
  reason: string;
}

export function balanceReviewWorkload(
  plans: Plan[],
  courses: Course[],
  exams: Exam[] = [],
  maxDailyMinutes = 45,
  now = Date.now(),
): WorkloadRebalanceProposal[] {
  const workloads = calculateDailyWorkloads(plans, courses, exams, 14, now);
  const proposals: WorkloadRebalanceProposal[] = [];

  for (let i = 0; i < workloads.length - 1; i++) {
    const currentDay = workloads[i]!;
    if (currentDay.estimatedMinutes > maxDailyMinutes) {
      // Trouver les cours déplaçables (non critiques, rétention solide)
      const movablePlans = currentDay.plans.filter((p) => {
        const retention = estimatePlanRetention(p, currentDay.date.getTime());
        // Ne déplacer que si la rétention est bonne (> 87%) et que ce n'est pas déjà en retard
        return (
          retention >= 0.87 &&
          new Date(p.nextReviewAt!).getTime() >= now
        );
      });

      for (const p of movablePlans) {
        if (currentDay.estimatedMinutes <= maxDailyMinutes) break;
        const nextDay = workloads[i + 1];
        if (nextDay && nextDay.estimatedMinutes + 10 <= maxDailyMinutes) {
          const postponed = postponeReview(p, 1, now);
          const course = courses.find((c) => c.id === p.courseId);
          proposals.push({
            planId: p.id,
            courseTitle: course?.title ?? "Cours",
            originalDate: p.nextReviewAt!,
            proposedDate: postponed.newDate.toISOString(),
            impact: postponed.impact,
            reason: `Lissage de charge (+${1} j) vers le ${format(nextDay.date, "dd/MM")}`,
          });

          const minutes = course?.estimatedReviewMinutes ?? 10;
          currentDay.estimatedMinutes -= minutes;
          nextDay.estimatedMinutes += minutes;
        }
      }
    }
  }

  return proposals;
}
