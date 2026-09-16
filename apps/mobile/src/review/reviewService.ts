import {
  CLASSIC_REVIEW_INTERVALS_HOURS,
  calculateNextReviewAt,
  calculateAdaptiveReview,
  entitySchema,
  type ReviewCommand,
  type ReviewRating,
  type MemoryState,
} from "@memocycle/contracts";
import { database } from "../database/database";
import { all, find, put, enqueue, changed } from "../database/repository";
import { courseSchema, planSchema } from "../database/entities";
import { newId } from "../utils/ids";
import { planToMemoryState } from "./fsrsScheduler";

import type { ReviewSessionType, StudyMethod } from "@memocycle/contracts";

export interface CompleteReviewOptions {
  rating?: ReviewRating;
  desiredRetention?: number;
  durationSeconds?: number;
  sessionType?: ReviewSessionType;
  studyMethod?: StudyMethod;
}

export async function completeReview(
  userId: string,
  courseId: string,
  command: ReviewCommand["command"],
  mutationId: string,
  ratingOrOptions?: ReviewRating | CompleteReviewOptions,
  desiredRetentionParam?: number,
) {
  const options: CompleteReviewOptions =
    typeof ratingOrOptions === "object" && ratingOrOptions !== null
      ? ratingOrOptions
      : {
          rating: ratingOrOptions,
          desiredRetention: desiredRetentionParam,
        };

  const rating = options.rating;
  const desiredRetention = options.desiredRetention;
  const durationSeconds = options.durationSeconds;
  const sessionType: ReviewSessionType = options.sessionType ?? "scheduled_review";
  const studyMethod = options.studyMethod;
  const db = await database();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync("PRAGMA defer_foreign_keys = ON");
    if (
      (await tx.getFirstAsync(
        "SELECT id FROM review_events WHERE owner_user_id=? AND id=?",
        userId,
        mutationId,
      )) ||
      (await tx.getFirstAsync(
        "SELECT id FROM sync_conflicts WHERE owner_user_id=? AND id=?",
        userId,
        mutationId,
      ))
    )
      return;
    if (
      await tx.getFirstAsync(
        "SELECT id FROM sync_outbox WHERE id=?",
        mutationId,
      )
    )
      return;
    const raw = await find("course", courseId, userId, tx);
    if (!raw) throw new Error("Cours introuvable");
    const course = courseSchema.parse(raw);
    if (course.archivedAt) throw new Error("Ce cours est archivé");
    const rawPlan = (await all("reviewPlan", userId, tx)).find(
      (p) => p.courseId === courseId,
    );
    const plan = rawPlan ? planSchema.parse(rawPlan) : null;
    if (
      (command === "start" && plan) ||
      (command === "complete" && plan?.status !== "active") ||
      (command === "restart" && plan?.status !== "completed")
    )
      throw new Error("Ce planning a changé. Rouvre le cours.");
    const at = new Date();
    const restart = command !== "complete";
    const planId = plan?.id ?? newId();
    const eventId = mutationId;
    const cycle = plan?.scheduleVersion ?? 1;
    const schedulerType = plan?.schedulerType ?? "fsrs";
    const retention = desiredRetention ?? plan?.desiredRetention ?? 0.90;
    const effectiveRating: ReviewRating = rating ?? "good";

    let next: string | null = null;
    let memoryState: MemoryState | null = null;
    let step = restart ? 0 : plan!.currentStep;
    let status = "active";

    const intervals = restart
      ? [...CLASSIC_REVIEW_INTERVALS_HOURS]
      : plan!.intervalsJson;

    if (schedulerType === "fsrs") {
      const prevState = restart ? null : planToMemoryState(plan!, at);
      const adaptiveResult = calculateAdaptiveReview({
        completedAt: at,
        rating: effectiveRating,
        previousState: prevState,
        desiredRetention: retention,
      });
      next = adaptiveResult.nextReviewAt.toISOString();
      memoryState = adaptiveResult.memoryState;
      step = restart ? 1 : Math.min(plan!.currentStep + 1, 6);
      status = "active";
    } else {
      next = calculateNextReviewAt(at, step, intervals)?.toISOString() ?? null;
      step = restart ? 1 : Math.min(step + 1, 6);
      status = next ? "active" : "completed";
    }

    const common = { userId, updatedAt: at.toISOString(), deletedAt: null };
    const eventEntity = entitySchema.parse({
      ...common,
      id: eventId,
      version: 1,
      courseId,
      reviewPlanId: planId,
      cycle: command === "restart" ? cycle + 1 : cycle,
      kind:
        command === "start"
          ? "initial_study"
          : command === "restart"
            ? "schedule_restarted"
            : "review_completed",
      stepIndex: restart ? null : (plan ? plan.currentStep : null),
      scheduledAt: restart ? null : plan!.nextReviewAt,
      completedAt: at.toISOString(),
      delayMinutes: restart
        ? 0
        : Math.max(
            0,
            Math.floor(
              (at.getTime() - new Date(plan!.nextReviewAt!).getTime()) / 60000,
            ),
          ),
      confidence: rating ?? (command === "start" ? "good" : null),
      durationSeconds: durationSeconds ?? null,
      sessionType,
      studyMethod: studyMethod ?? null,
    });

    const planEntity = entitySchema.parse({
      ...common,
      id: planId,
      version: (plan?.version ?? 0) + 1,
      courseId,
      schedulerType,
      intervalsJson: intervals,
      scheduleVersion: command === "restart" ? cycle + 1 : cycle,
      currentStep: step,
      nextReviewAt: next,
      startedAt: restart ? at.toISOString() : plan!.startedAt,
      lastReviewedAt: restart ? null : at.toISOString(),
      completedAt: status === "completed" ? at.toISOString() : null,
      status,
      desiredRetention: retention,
      difficulty: memoryState?.difficulty ?? plan?.difficulty ?? null,
      stability: memoryState?.stability ?? plan?.stability ?? null,
      retrievability: memoryState?.retrievability ?? plan?.retrievability ?? null,
      scheduledDays: memoryState?.scheduledDays ?? plan?.scheduledDays ?? null,
      elapsedDays: memoryState?.elapsedDays ?? plan?.elapsedDays ?? null,
      reps: memoryState?.reps ?? (restart ? 1 : (plan?.reps ?? 0) + 1),
      lapses: memoryState?.lapses ?? plan?.lapses ?? 0,
      lastRating: effectiveRating,
    });

    // A new event references its plan. On the first study, create that parent
    // earlier in the same transaction; later validations keep the append-first order.
    if (!plan) await put(tx, "reviewPlan", planEntity, "pending");
    await put(tx, "reviewEvent", eventEntity, "pending");
    if (plan) await put(tx, "reviewPlan", planEntity, "pending");
    await put(
      tx,
      "course",
      {
        ...course,
        ...common,
        version: (course.version ?? 0) + 1,
        status: status === "completed" ? "completed" : "active",
        studiedAt: restart ? at.toISOString() : course.studiedAt,
      },
      "pending",
    );
    const payload: ReviewCommand = {
      command,
      courseId,
      reviewPlanId: planId,
      eventId,
      completedAt: at.toISOString(),
      stepIndex: plan ? plan.currentStep : 0,
      cycle,
      rating: effectiveRating,
      desiredRetention: retention,
      durationSeconds: durationSeconds ?? null,
      sessionType,
      studyMethod: studyMethod ?? null,
    };
    await enqueue(tx, userId, {
      clientMutationId: mutationId,
      entityType: "reviewPlan",
      entityId: planId,
      operation: "command",
      baseVersion: plan?.version ?? null,
      payload,
    });
  });
  changed();
}
