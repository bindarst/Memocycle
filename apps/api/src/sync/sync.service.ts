import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  CLASSIC_REVIEW_INTERVALS_HOURS,
  calculateNextReviewAt,
  calculateAdaptiveReview,
  entitySchema,
  entityTypeSchema,
  subjectInput,
  moduleInput,
  courseInput,
  examInput,
  studyItemInput,
  settingsInput,
  reviewCommandSchema,
  mutationResultSchema,
  type EntityType,
  type Mutation,
  type MutationResult,
  type SyncRequest,
  type SyncResponse,
  type MemoryState,
} from "@memocycle/contracts";
import { PrismaService } from "../database/prisma.service";
type Tx = Prisma.TransactionClient;
const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
@Injectable()
export class SyncService {
  constructor(private readonly db: PrismaService) {}
  private async read(tx: Tx, type: EntityType, id: string, userId: string) {
    const where = { id, userId };
    switch (type) {
      case "subject":
        return tx.subject.findFirst({ where });
      case "module":
        return tx.module.findFirst({ where });
      case "course":
        return tx.course.findFirst({ where });
      case "exam":
        return tx.exam.findFirst({ where });
      case "studyItem":
        return tx.studyItem.findFirst({ where });
      case "reviewPlan":
        return tx.reviewPlan.findFirst({ where });
      case "reviewEvent":
        return tx.reviewEvent.findFirst({ where });
      case "userSettings":
        return tx.userSettings.findFirst({ where });
    }
  }
  private async change(
    tx: Tx,
    userId: string,
    entityType: EntityType,
    entity: unknown,
  ) {
    // A transactional user counter also locks the account. Sequence allocation follows commit order.
    const user = await tx.user.update({
      where: { id: userId },
      data: { syncSequence: { increment: 1 } },
    });
    await tx.syncChange.create({
      data: {
        userId,
        syncSeq: user.syncSequence,
        entityType,
        entity: json(entity),
      },
    });
  }
  private async parents(
    tx: Tx,
    userId: string,
    subjectId: string,
    moduleId?: string | null,
  ) {
    const subject = await tx.subject.findFirst({
      where: { id: subjectId, userId, deletedAt: null },
    });
    if (!subject) return false;
    if (
      moduleId &&
      !(await tx.module.findFirst({
        where: { id: moduleId, subjectId, userId, deletedAt: null },
      }))
    )
      return false;
    return true;
  }
  private async apply(
    tx: Tx,
    userId: string,
    deviceId: string,
    m: Mutation,
  ): Promise<MutationResult> {
    const fail = (
      status: "conflict" | "rejected",
      reason: string,
      entity?: unknown,
    ): MutationResult => ({
      clientMutationId: m.clientMutationId,
      status,
      reason,
      ...(entity ? { entity: entitySchema.parse(json(entity)) } : {}),
    });
    if (m.operation === "command") {
      if (m.entityType !== "reviewPlan")
        return fail("rejected", "Commande inconnue");
      const c = reviewCommandSchema.parse(m.payload);
      if (c.reviewPlanId !== m.entityId)
        return fail("rejected", "Identifiant incohérent");
      const at = new Date(c.completedAt);
      if (at.getTime() > Date.now() + 5 * 60_000)
        return fail("rejected", "Vérifie la date de ton appareil");
      const course = await tx.course.findFirst({
        where: { id: c.courseId, userId, deletedAt: null, archivedAt: null },
      });
      if (
        !course ||
        !(await this.parents(tx, userId, course.subjectId, course.moduleId))
      )
        return fail("rejected", "Cours indisponible");
      const plan = await tx.reviewPlan.findFirst({
        where: { courseId: c.courseId, userId },
      });
      if (c.command === "start" && (plan || c.stepIndex !== 0 || c.cycle !== 1))
        return fail("conflict", "Cycle déjà démarré", plan);
      if (
        c.command !== "start" &&
        (!plan ||
          plan.id !== c.reviewPlanId ||
          plan.scheduleVersion !== c.cycle ||
          plan.version !== m.baseVersion)
      )
        return fail(
          "conflict",
          "Planning mis à jour sur un autre appareil",
          plan,
        );
      if (
        c.command === "complete" &&
        (!plan ||
          plan.status !== "active" ||
          c.stepIndex !== plan.currentStep ||
          at.getTime() <
            new Date(plan.lastReviewedAt ?? plan.startedAt).getTime())
      )
        return fail("conflict", "Étape déjà validée ou date incohérente", plan);
      if (c.command === "restart" && plan?.status !== "completed")
        return fail("rejected", "Le cycle doit être terminé");
      const restarting = c.command !== "complete";
      const cycle = c.command === "restart" ? c.cycle + 1 : c.cycle;
      const schedulerType = plan?.schedulerType ?? "fsrs";
      const desiredRetention = plan?.desiredRetention ?? c.desiredRetention ?? 0.9;
      const effectiveRating = c.rating ?? "good";

      let next: Date | null = null;
      let memoryState: MemoryState | null = null;
      let step = restarting ? 0 : c.stepIndex;
      let status = "active";
      let intervals: number[] = [];

      if (schedulerType === "fsrs") {
        const prevState = restarting || !plan ? null : {
          stability: plan.stability ?? undefined,
          difficulty: plan.difficulty ?? undefined,
          retrievability: plan.retrievability ?? undefined,
          scheduledDays: plan.scheduledDays ?? undefined,
          elapsedDays: plan.elapsedDays ?? undefined,
          reps: plan.reps ?? 0,
          lapses: plan.lapses ?? 0,
          lastReviewDate: plan.lastReviewedAt ? plan.lastReviewedAt.toISOString() : plan.startedAt.toISOString(),
        };
        const adaptiveResult = calculateAdaptiveReview({
          completedAt: at,
          rating: effectiveRating,
          previousState: prevState,
          desiredRetention,
        });
        next = adaptiveResult.nextReviewAt;
        memoryState = adaptiveResult.memoryState;
        step = restarting ? 1 : Math.min(c.stepIndex + 1, 6);
        status = "active";
        intervals = [];
      } else {
        intervals = restarting
          ? [...CLASSIC_REVIEW_INTERVALS_HOURS]
          : z.array(z.number().positive()).parse(plan!.intervalsJson);
        next = calculateNextReviewAt(
          at,
          restarting ? 0 : c.stepIndex,
          intervals,
        );
        step = restarting ? 1 : Math.min(c.stepIndex + 1, 6);
        status = next ? "active" : "completed";
      }

      const data = {
        intervalsJson: intervals,
        schedulerType,
        scheduleVersion: cycle,
        currentStep: step,
        nextReviewAt: next,
        status,
        lastReviewedAt: restarting ? null : at,
        completedAt: status === "completed" ? at : null,
        desiredRetention,
        difficulty: memoryState?.difficulty ?? plan?.difficulty ?? null,
        stability: memoryState?.stability ?? plan?.stability ?? null,
        retrievability: memoryState?.retrievability ?? plan?.retrievability ?? null,
        scheduledDays: memoryState?.scheduledDays ?? plan?.scheduledDays ?? null,
        elapsedDays: memoryState?.elapsedDays ?? plan?.elapsedDays ?? null,
        reps: memoryState?.reps ?? (restarting ? 1 : (plan?.reps ?? 0) + 1),
        lapses: memoryState?.lapses ?? plan?.lapses ?? 0,
        lastRating: effectiveRating,
        ...(restarting ? { startedAt: at } : {}),
      };
      const updated = plan
        ? await tx.reviewPlan.update({
            where: { id: plan.id },
            data: { ...data, version: { increment: 1 } },
          })
        : await tx.reviewPlan.create({
            data: {
              ...data,
              id: c.reviewPlanId,
              courseId: course.id,
              userId,
              startedAt: at,
            },
          });
      const event = await tx.reviewEvent.create({
        data: {
          id: c.eventId,
          userId,
          courseId: course.id,
          reviewPlanId: updated.id,
          cycle,
          kind:
            c.command === "start"
              ? "initial_study"
              : c.command === "restart"
                ? "schedule_restarted"
                : "review_completed",
          stepIndex: restarting ? null : c.stepIndex,
          scheduledAt: restarting ? null : plan!.nextReviewAt,
          completedAt: at,
          delayMinutes: restarting
            ? 0
            : Math.max(
                0,
                Math.floor(
                  (at.getTime() - plan!.nextReviewAt!.getTime()) / 60000,
                ),
              ),
          confidence: c.rating ?? (c.command === "start" ? "good" : null),
          deviceId,
        },
      });
      // Course version protects metadata edits. ReviewPlan.version protects lifecycle commands.
      // Completing a review must not cause an independent title edit to conflict.
      const updatedCourse = await tx.course.update({
        where: { id: course.id },
        data: {
          status: status === "completed" ? "completed" : "active",
          ...(restarting ? { studiedAt: at } : {}),
        },
      });
      await this.change(tx, userId, "course", updatedCourse);
      await this.change(tx, userId, "reviewPlan", updated);
      await this.change(tx, userId, "reviewEvent", event);
      return {
        clientMutationId: m.clientMutationId,
        status: "accepted",
        entity: entitySchema.parse(json(updated)),
      };
    }
    if (m.entityType === "reviewPlan" || m.entityType === "reviewEvent")
      return fail("rejected", "Historique protégé");
    const current = await this.read(tx, m.entityType, m.entityId, userId);
    if (
      m.operation === "create"
        ? current !== null || m.baseVersion !== null
        : !current ||
          current.version !== m.baseVersion ||
          current.deletedAt !== null
    )
      return fail("conflict", "Version serveur conservée", current);
    let entity: unknown;
    const common = { id: m.entityId, userId };
    const update = { version: { increment: 1 } };
    if (m.operation === "delete") {
      if (m.entityType === "userSettings")
        return fail("rejected", "Paramètres requis");
      // Parent deletions are rejected while children exist; clients explicitly remove children first.
      if (
        m.entityType === "subject" &&
        (await tx.course.count({
          where: { userId, subjectId: m.entityId, deletedAt: null },
        })) +
          (await tx.module.count({
            where: { userId, subjectId: m.entityId, deletedAt: null },
          })) +
          (await tx.exam.count({
            where: { userId, subjectId: m.entityId, deletedAt: null },
          })) >
          0
      )
        return fail(
          "rejected",
          "Supprime les éléments de cette matière en premier",
        );
      if (
        m.entityType === "module" &&
        (await tx.course.count({
          where: { userId, moduleId: m.entityId, deletedAt: null },
        })) +
          (await tx.exam.count({
            where: { userId, moduleId: m.entityId, deletedAt: null },
          })) >
          0
      )
        return fail("rejected", "Déplace les éléments de ce module en premier");
      const data = { deletedAt: new Date(), ...update };
      switch (m.entityType) {
        case "subject":
          entity = await tx.subject.update({ where: { id: m.entityId }, data });
          break;
        case "module":
          entity = await tx.module.update({ where: { id: m.entityId }, data });
          break;
        case "exam":
          entity = await tx.exam.update({ where: { id: m.entityId }, data });
          break;
        case "studyItem":
          entity = await tx.studyItem.update({ where: { id: m.entityId }, data });
          break;
        case "course": {
          entity = await tx.course.update({ where: { id: m.entityId }, data });
          const plan = await tx.reviewPlan.findFirst({
            where: { courseId: m.entityId, userId },
          });
          if (plan)
            await this.change(
              tx,
              userId,
              "reviewPlan",
              await tx.reviewPlan.update({
                where: { id: plan.id },
                data: { ...data, status: "deleted", nextReviewAt: null },
              }),
            );
          const studyItems = await tx.studyItem.findMany({
            where: { courseId: m.entityId, userId, deletedAt: null },
          });
          for (const item of studyItems) {
            const updatedItem = await tx.studyItem.update({
              where: { id: item.id },
              data,
            });
            await this.change(tx, userId, "studyItem", updatedItem);
          }
          // Events remain immutable; deleted course hides them until retention purge.
          break;
        }
      }
    } else {
      switch (m.entityType) {
        case "subject": {
          const data = subjectInput.parse(m.payload);
          entity =
            m.operation === "create"
              ? await tx.subject.create({ data: { ...common, ...data } })
              : await tx.subject.update({
                  where: { id: m.entityId },
                  data: { ...data, ...update },
                });
          break;
        }
        case "module": {
          const data = moduleInput.parse(m.payload);
          if (!(await this.parents(tx, userId, data.subjectId)))
            return fail("rejected", "Matière indisponible");
          entity =
            m.operation === "create"
              ? await tx.module.create({ data: { ...common, ...data } })
              : await tx.module.update({
                  where: { id: m.entityId },
                  data: { ...data, ...update },
                });
          break;
        }
        case "course": {
          const data = courseInput.parse(m.payload);
          if (!(await this.parents(tx, userId, data.subjectId, data.moduleId)))
            return fail("rejected", "Matière ou module indisponible");
          const plan = await tx.reviewPlan.findFirst({
            where: { courseId: m.entityId, userId },
          });
          const status = data.archivedAt
            ? "archived"
            : plan?.status === "completed"
              ? "completed"
              : plan
                ? "active"
                : "draft";
          entity =
            m.operation === "create"
              ? await tx.course.create({ data: { ...common, ...data, status } })
              : await tx.course.update({
                  where: { id: m.entityId },
                  data: { ...data, status, ...update },
                });
          break;
        }
        case "studyItem": {
          const data = studyItemInput.parse(m.payload);
          const course = await tx.course.findFirst({
            where: { id: data.courseId, userId, deletedAt: null },
          });
          if (!course) return fail("rejected", "Cours indisponible");
          entity =
            m.operation === "create"
              ? await tx.studyItem.create({ data: { ...common, ...data } })
              : await tx.studyItem.update({
                  where: { id: m.entityId },
                  data: { ...data, ...update },
                });
          break;
        }
        case "exam": {
          const data = examInput.parse(m.payload);
          if (!(await this.parents(tx, userId, data.subjectId, data.moduleId)))
            return fail("rejected", "Matière ou module indisponible");
          entity =
            m.operation === "create"
              ? await tx.exam.create({ data: { ...common, ...data } })
              : await tx.exam.update({
                  where: { id: m.entityId },
                  data: { ...data, ...update },
                });
          break;
        }
        case "userSettings": {
          if (m.operation === "create")
            return fail("rejected", "Paramètres déjà initialisés");
          const data = settingsInput.parse(m.payload);
          entity = await tx.userSettings.update({
            where: { id: m.entityId },
            data: { ...data, ...update },
          });
          await tx.user.update({
            where: { id: userId },
            data: { onboardingCompleted: data.onboardingCompleted },
          });
          break;
        }
      }
    }
    await this.change(tx, userId, m.entityType, entity);
    return {
      clientMutationId: m.clientMutationId,
      status: "accepted",
      entity: entitySchema.parse(json(entity)),
    };
  }
  async sync(
    userId: string,
    deviceId: string,
    request: SyncRequest,
  ): Promise<SyncResponse> {
    const mutationResults: MutationResult[] = [];
    for (const m of request.mutations) {
      const result = await this.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
        if (
          !(await tx.user.findFirst({
            where: { id: userId, status: "active" },
          }))
        )
          throw new UnauthorizedException();
        const hash = createHash("sha256")
          .update(JSON.stringify(m))
          .digest("hex");
        const previous = await tx.processedMutation.findUnique({
          where: { clientMutationId: m.clientMutationId },
        });
        if (previous)
          return previous.userId === userId && previous.requestHash === hash
            ? mutationResultSchema.parse(previous.result)
            : {
                clientMutationId: m.clientMutationId,
                status: "rejected" as const,
                reason: "Identifiant de mutation réutilisé",
              };
        let result: MutationResult;
        // Savepoint isolates invalid foreign key / UUID collision failures without poisoning the transaction.
        await tx.$executeRawUnsafe("SAVEPOINT mutation_apply");
        try {
          result = await this.apply(tx, userId, deviceId, m);
        } catch (e) {
          await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT mutation_apply");
          if (
            e instanceof z.ZodError ||
            (e instanceof Prisma.PrismaClientKnownRequestError &&
              ["P2002", "P2003", "P2025"].includes(e.code))
          )
            result = {
              clientMutationId: m.clientMutationId,
              status: "rejected",
              reason: "Données invalides ou relation indisponible",
            };
          else throw e;
        }
        await tx.processedMutation.create({
          data: {
            userId,
            clientMutationId: m.clientMutationId,
            requestHash: hash,
            result: json(result),
          },
        });
        return result;
      });
      mutationResults.push(result);
    }
    return this.db.$transaction(async (tx) => {
      const cursor = BigInt(request.cursor ?? "0");
      const rows = await tx.syncChange.findMany({
        where: { userId, syncSeq: { gt: cursor } },
        orderBy: { syncSeq: "asc" },
        take: 501,
      });
      const hasMore = rows.length > 500;
      const page = rows.slice(0, 500);
      const changes = page.map((r) => ({
        entityType: entityTypeSchema.parse(r.entityType),
        entity: entitySchema.parse(r.entity),
      }));
      if (request.cursor === null) {
        const settings = await tx.userSettings.findUnique({
          where: { userId },
        });
        if (settings)
          changes.unshift({
            entityType: "userSettings",
            entity: entitySchema.parse(json(settings)),
          });
      }
      await tx.device.updateMany({
        where: { id: deviceId, userId },
        data: { lastSyncAt: new Date(), lastSeenAt: new Date() },
      });
      return {
        cursor: page.at(-1)?.syncSeq.toString() ?? cursor.toString(),
        hasMore,
        changes,
        mutationResults,
      };
    });
  }
}
