import "reflect-metadata";
import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { randomUUID } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../apps/api/src/database/prisma.service";
import { SyncService } from "../apps/api/src/sync/sync.service";
import {
  SessionService,
  hashToken,
} from "../apps/api/src/auth/session/session.service";
import { AccountService } from "../apps/api/src/account/account.service";
import { AuthService } from "../apps/api/src/auth/auth.service";
import { GoogleAuthService } from "../apps/api/src/auth/google/google-auth.service";
import { AppleAuthService } from "../apps/api/src/auth/apple/apple-auth.service";
import type { Mutation } from "../packages/contracts/src";
const url = process.env.TEST_DATABASE_URL;
if (!url || !url.includes("memocycle_test"))
  throw new Error(
    "TEST_DATABASE_URL must point to the isolated memocycle_test database",
  );
const db = new PrismaService({ datasourceUrl: url });
const sync = new SyncService(db);
const jwt = new JwtService({
  secret: "test-only-secret-with-at-least-32-bytes",
});
const sessions = new SessionService(db, jwt);
let userId: string, deviceId: string;
const mutation = (
  entityType: Mutation["entityType"],
  entityId: string,
  payload: unknown,
  operation: Mutation["operation"] = "create",
  baseVersion: number | null = null,
): Mutation => ({
  clientMutationId: randomUUID(),
  entityType,
  entityId,
  payload,
  operation,
  baseVersion,
});
const send = (m: Mutation[], cursor: string | null = null) =>
  sync.sync(userId, deviceId, { cursor, mutations: m });
async function seed() {
  const subject = randomUUID(),
    course = randomUUID(),
    plan = randomUUID();
  await send([
    mutation("subject", subject, { title: "Machines" }),
    mutation("course", course, {
      title: "Transformateurs",
      subjectId: subject,
    }),
  ]);
  await send([
    mutation(
      "reviewPlan",
      plan,
      {
        command: "start",
        courseId: course,
        reviewPlanId: plan,
        eventId: randomUUID(),
        completedAt: "2026-01-01T12:00:00.000Z",
        stepIndex: 0,
        cycle: 1,
      },
      "command",
    ),
  ]);
  return { subject, course, plan };
}
beforeAll(() => db.$connect());
afterAll(() => db.$disconnect());
beforeEach(async () => {
  await db.user.deleteMany();
  const user = await db.user.create({
    data: {
      email: "test@example.com",
      timezone: "Europe/Brussels",
      settings: { create: {} },
    },
  });
  userId = user.id;
  deviceId = (
    await db.device.create({
      data: {
        userId,
        installationId: randomUUID(),
        platform: "android",
        appVersion: "test",
      },
    })
  ).id;
});
describe("PostgreSQL transactions and synchronization", () => {
  it("deduplicates replayed mutations, preserves changed title during review, and pages changes", async () => {
    const { course, plan } = await seed();
    const rename = mutation(
      "course",
      course,
      {
        title: "Titre corrigé",
        subjectId: (
          await db.course.findUniqueOrThrow({ where: { id: course } })
        ).subjectId,
      },
      "update",
      1,
    );
    expect((await send([rename])).mutationResults[0]?.status).toBe("accepted");
    const review = mutation(
      "reviewPlan",
      plan,
      {
        command: "complete",
        courseId: course,
        reviewPlanId: plan,
        eventId: randomUUID(),
        completedAt: "2026-01-03T13:00:00.000Z",
        stepIndex: 1,
        cycle: 1,
      },
      "command",
      1,
    );
    const result = await send([review]);
    await send([review]);
    expect(
      await db.reviewEvent.count({ where: { kind: "review_completed" } }),
    ).toBe(1);
    expect(
      (await db.course.findUniqueOrThrow({ where: { id: course } })).title,
    ).toBe("Titre corrigé");
    expect(
      (
        await db.reviewPlan.findUniqueOrThrow({ where: { id: plan } })
      ).nextReviewAt?.toISOString(),
    ).toBe("2026-01-06T13:00:00.000Z");
    expect((await send([], result.cursor)).changes).toEqual([]);
  });
  it("allows only one of two concurrent completions of the same step", async () => {
    const { course, plan } = await seed();
    const command = () =>
      mutation(
        "reviewPlan",
        plan,
        {
          command: "complete",
          courseId: course,
          reviewPlanId: plan,
          eventId: randomUUID(),
          completedAt: "2026-01-03T13:00:00.000Z",
          stepIndex: 1,
          cycle: 1,
        },
        "command",
        1,
      );
    const results = await Promise.all([send([command()]), send([command()])]);
    expect(results.map((r) => r.mutationResults[0]?.status).sort()).toEqual([
      "accepted",
      "conflict",
    ]);
    expect(
      await db.reviewEvent.count({ where: { kind: "review_completed" } }),
    ).toBe(1);
  });
  it("rejects cross-account parent references and preserves version on conflict", async () => {
    const { subject, course } = await seed();
    const other = await db.user.create({
      data: { email: "other@example.com", timezone: "UTC" },
    });
    const m = mutation("course", randomUUID(), {
      title: "Forbidden",
      subjectId: subject,
    });
    expect(
      (await sync.sync(other.id, deviceId, { cursor: null, mutations: [m] }))
        .mutationResults[0]?.status,
    ).toBe("rejected");
    expect(
      (
        await send([
          mutation(
            "course",
            course,
            { title: "Old", subjectId: subject },
            "update",
            99,
          ),
        ])
      ).mutationResults[0]?.status,
    ).toBe("conflict");
    expect(await db.course.count({ where: { userId: other.id } })).toBe(0);
  });
  it("rolls back planning changes if inserting the immutable event fails", async () => {
    const { course, plan } = await seed();
    const event = await db.reviewEvent.findFirstOrThrow();
    const m = mutation(
      "reviewPlan",
      plan,
      {
        command: "complete",
        courseId: course,
        reviewPlanId: plan,
        eventId: event.id,
        completedAt: "2026-01-03T13:00:00.000Z",
        stepIndex: 1,
        cycle: 1,
      },
      "command",
      1,
    );
    expect((await send([m])).mutationResults[0]?.status).toBe("rejected");
    expect(
      (await db.reviewPlan.findUniqueOrThrow({ where: { id: plan } })).version,
    ).toBe(1);
  });
  it("creates, updates and cascades deletion of study items via sync mutations", async () => {
    const { course } = await seed();
    const itemId = randomUUID();
    const createItem = mutation("studyItem", itemId, {
      courseId: course,
      type: "flashcard",
      front: "Recto Test",
      back: "Verso Test",
      hint: "Indice",
      position: 0,
      archivedAt: null,
    });
    const resCreate = await send([createItem]);
    expect(resCreate.mutationResults[0]?.status).toBe("accepted");
    expect(await db.studyItem.count({ where: { id: itemId, deletedAt: null } })).toBe(1);

    const updateItem = mutation(
      "studyItem",
      itemId,
      {
        courseId: course,
        type: "flashcard",
        front: "Recto Modifié",
        back: "Verso Test",
        hint: null,
        position: 1,
        archivedAt: null,
      },
      "update",
      1,
    );
    const resUpdate = await send([updateItem]);
    expect(resUpdate.mutationResults[0]?.status).toBe("accepted");
    expect(
      (await db.studyItem.findUniqueOrThrow({ where: { id: itemId } })).front,
    ).toBe("Recto Modifié");

    // Deleting course cascades to mark studyItem deleted
    const deleteCourse = mutation("course", course, {}, "delete", 1);
    await send([deleteCourse]);
    expect(
      await db.studyItem.count({ where: { id: itemId, deletedAt: null } }),
    ).toBe(0);
  });
});
describe("sessions and account lifecycle", () => {
  it("stores only refresh hashes, rotates and revokes on replay", async () => {
    const first = await sessions.createSession(userId, deviceId);
    expect((await db.session.findFirstOrThrow()).refreshTokenHash).toBe(
      hashToken(first.refreshToken),
    );
    const next = await sessions.refresh(first.refreshToken);
    expect(next.refreshToken).not.toBe(first.refreshToken);
    await expect(sessions.refresh(first.refreshToken)).rejects.toThrow();
    await expect(sessions.refresh(next.refreshToken)).rejects.toThrow();
    const p = jwt.decode(first.accessToken) as {
      exp: number;
      iat: number;
      email?: string;
    };
    expect(p.exp - p.iat).toBe(900);
    expect(p.email).toBeUndefined();
  });
  it("rejects expired and suspended sessions and handles logout all", async () => {
    const a = await sessions.createSession(userId, deviceId);
    await db.session.updateMany({ data: { expiresAt: new Date(0) } });
    await expect(sessions.refresh(a.refreshToken)).rejects.toThrow();
    const b = await sessions.createSession(userId, deviceId);
    await db.user.update({
      where: { id: userId },
      data: { status: "suspended" },
    });
    await expect(sessions.refresh(b.refreshToken)).rejects.toThrow();
    await db.user.update({ where: { id: userId }, data: { status: "active" } });
    await sessions.revoke(userId);
    await expect(sessions.refresh(b.refreshToken)).rejects.toThrow();
  });
  it("deletes all account data atomically and deletion service is idempotent", async () => {
    await seed();
    const s = await sessions.createSession(userId, deviceId);
    const account = new AccountService(db);
    await account.deleteAccount(userId);
    await account.deleteAccount(userId);
    expect(await db.course.count()).toBe(0);
    expect(await db.session.count()).toBe(0);
    expect(await db.reviewEvent.count()).toBe(0);
    expect(await db.syncChange.count()).toBe(0);
    await expect(sessions.refresh(s.refreshToken)).rejects.toThrow();
  });
  it("creates a Google identity once and never links by email", async () => {
    const google = new GoogleAuthService();
    vi.spyOn(google, "verifyGoogleIdToken").mockResolvedValue({
      providerSubject: "google-subject",
      email: "same@example.com",
      displayName: "Student",
      avatarUrl: null,
    });
    const auth = new AuthService(db, google, new AppleAuthService(), sessions);
    const input = {
      idToken: "test-token",
      timezone: "Europe/Brussels",
      device: {
        installationId: randomUUID(),
        platform: "android" as const,
        appVersion: "1",
      },
    };
    const first = await auth.signIn("google", input);
    const next = await auth.signIn("google", input);
    expect(next.user.id).toBe(first.user.id);
    expect(await db.authIdentity.count()).toBe(1);
  });
});
