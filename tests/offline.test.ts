import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { SQLiteDatabase } from "expo-sqlite";
import { SqliteAdapter } from "./databaseAdapter";
const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("../apps/mobile/src/database/database", () => ({
  database: async () => holder.db,
}));
vi.mock("expo-crypto", () => ({ randomUUID }));
import { migrate } from "../apps/mobile/src/database/migrations";
import { initialSchema } from "../apps/mobile/src/database/schema";
import { save, all, find, wipeUser } from "../apps/mobile/src/database/repository";
import { completeReview } from "../apps/mobile/src/review/reviewService";
import { subjectInput, courseInput } from "../packages/contracts/src";
describe("real SQLite offline workflow", () => {
  let db: SqliteAdapter;
  const user = randomUUID();
  beforeEach(async () => {
    db = new SqliteAdapter();
    holder.db = db;
    await migrate(db as unknown as SQLiteDatabase);
  });
  afterEach(() => db.close());
  async function seed() {
    const subject = await save(
      "subject",
      user,
      subjectInput.parse({ title: "Électricité" }),
    );
    const course = await save(
      "course",
      user,
      courseInput.parse({ title: "Transformateurs", subjectId: subject }),
    );
    return course;
  }
  it("creates, studies and completes offline with an idempotent double tap", async () => {
    const course = await seed();
    await completeReview(user, course, "start", randomUUID());
    const mutation = randomUUID();
    await completeReview(user, course, "complete", mutation);
    await completeReview(user, course, "complete", mutation);
    const plans = await all("reviewPlan", user);
    expect(plans[0]?.currentStep).toBe(2);
    expect(await all("reviewEvent", user)).toHaveLength(2);
    expect(
      (
        await db.getFirstAsync<{ n: number }>(
          "SELECT COUNT(*) n FROM sync_outbox",
        )
      )?.n,
    ).toBe(4);
  });
  it("creates StudyItem and performs FSRS adaptive review with rating offline", async () => {
    const course = await seed();
    const itemId = await save("studyItem", user, {
      courseId: course,
      type: "flashcard",
      front: "Qu'est-ce qu'un transformateur ?",
      back: "Un appareil statique convertissant une tension alternative.",
      hint: "Machine électrique",
      position: 0,
      archivedAt: null,
    });
    const items = await all("studyItem", user);
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe(itemId);

    await completeReview(user, course, "start", randomUUID(), "good");
    const planAfterStart = (await all("reviewPlan", user))[0];
    expect(planAfterStart?.schedulerType).toBe("fsrs");

    const completeMutation = randomUUID();
    await completeReview(user, course, "complete", completeMutation, "hard");
    const planAfterComplete = (await all("reviewPlan", user))[0];
    expect(planAfterComplete?.lastRating).toBe("hard");
    expect(planAfterComplete?.stability).toBeDefined();

    const events = await all("reviewEvent", user);
    expect(events).toHaveLength(2);
    expect(events[1]?.confidence).toBe("hard");
  });
  it("rolls back event, plan, course and mutation if outbox insertion fails", async () => {
    const course = await seed();
    await completeReview(user, course, "start", randomUUID());
    const before = await all("reviewPlan", user);
    await db.execAsync(
      "CREATE TRIGGER fail_outbox BEFORE INSERT ON sync_outbox BEGIN SELECT RAISE(ABORT,'test failure'); END;",
    );
    await expect(
      completeReview(user, course, "complete", randomUUID()),
    ).rejects.toThrow();
    expect(await all("reviewPlan", user)).toEqual(before);
    expect(await all("reviewEvent", user)).toHaveLength(1);
  });
  it("isolates accounts and wipes only the selected account", async () => {
    await seed();
    const other = randomUUID();
    await save("subject", other, subjectInput.parse({ title: "Autre compte" }));
    expect(await all("course", other)).toEqual([]);
    await wipeUser(user);
    expect(await all("subject", user)).toEqual([]);
    expect(await all("subject", other)).toHaveLength(1);
  });
  it("archives and restores a course locally without resetting its plan", async () => {
    const course = await seed();
    await completeReview(user, course, "start", randomUUID());
    const subject = (await all("subject", user))[0]!;
    const archivedAt = new Date().toISOString();
    await save(
      "course",
      user,
      courseInput.parse({
        title: "Transformateurs",
        subjectId: subject.id,
        archivedAt,
      }),
      course,
    );
    expect((await find("course", course, user))?.status).toBe("archived");
    await save(
      "course",
      user,
      courseInput.parse({
        title: "Transformateurs",
        subjectId: subject.id,
        archivedAt: null,
      }),
      course,
    );
    expect((await find("course", course, user))?.status).toBe("active");
    expect(await all("reviewPlan", user)).toHaveLength(1);
  });
  it("reruns migrations without erasing data and rolls back failed migration", async () => {
    await seed();
    await migrate(db as unknown as SQLiteDatabase);
    expect(await all("course", user)).toHaveLength(1);
    const bad = new SqliteAdapter();
    await bad.execAsync("CREATE TABLE modules(id TEXT);");
    await expect(migrate(bad as unknown as SQLiteDatabase)).rejects.toThrow();
    expect(await bad.getFirstAsync("PRAGMA user_version")).toEqual({
      user_version: 0,
    });
    expect(
      await bad.getFirstAsync(
        "SELECT name FROM sqlite_master WHERE name='subjects'",
      ),
    ).toBeNull();
    bad.close();
  });
  it("upgrades a version 1 database without losing its synchronization shadow", async () => {
    const old = new SqliteAdapter();
    await old.execAsync(initialSchema);
    await old.execAsync("PRAGMA user_version = 1");
    const entityId = randomUUID();
    const entity = JSON.stringify({
      id: entityId,
      userId: user,
      title: "Conservé",
      version: 1,
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });
    await old.runAsync(
      "INSERT INTO server_shadow(owner_user_id,entity_type,entity_id,data) VALUES(?,?,?,?)",
      user,
      "subject",
      entityId,
      entity,
    );
    await migrate(old as unknown as SQLiteDatabase);
    expect(await old.getFirstAsync("PRAGMA user_version")).toEqual({
      user_version: 3,
    });
    expect(
      await old.getFirstAsync<{ data: string; needs_apply: number }>(
        "SELECT data,needs_apply FROM server_shadow WHERE owner_user_id=?",
        user,
      ),
    ).toEqual({ data: entity, needs_apply: 1 });
    old.close();
  });
});
