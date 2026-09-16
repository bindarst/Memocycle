import type { Plan } from "../database/entities";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function anchorFor(plan: Plan) {
  return new Date(plan.lastReviewedAt ?? plan.startedAt).getTime();
}

export function stabilityMs(plan: Plan) {
  if (!plan.nextReviewAt) return 30 * DAY;
  const interval = new Date(plan.nextReviewAt).getTime() - anchorFor(plan);
  return Math.max(HOUR, interval);
}

export function retentionAt(plan: Plan, at = Date.now()) {
  const elapsed = Math.max(0, at - anchorFor(plan));
  const retention = Math.exp(Math.log(0.9) * (elapsed / stabilityMs(plan)));
  return Math.max(0.05, Math.min(1, retention));
}

export function averageRetention(plans: Plan[], at = Date.now()) {
  const active = plans.filter((plan) => plan.status === "active");
  if (!active.length) return 1;
  return (
    active.reduce((sum, plan) => sum + retentionAt(plan, at), 0) /
    active.length
  );
}

export function curveHorizonMs(plans: Plan[]) {
  const active = plans.filter((plan) => plan.status === "active");
  if (!active.length) return 7 * DAY;
  const longest = Math.max(...active.map(stabilityMs));
  return Math.min(60 * DAY, Math.max(7 * DAY, longest * 1.25));
}

export function formatHorizon(milliseconds: number) {
  const days = Math.round(milliseconds / DAY);
  return days === 1 ? "1 jour" : `${days} jours`;
}
