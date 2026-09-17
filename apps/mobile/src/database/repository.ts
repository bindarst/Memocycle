import type { SQLiteDatabase } from "expo-sqlite";
import {
  entitySchema,
  type Entity,
  type EntityType,
  type Mutation,
} from "@memocycle/contracts";
import { database } from "./database";
import { tables } from "./schema";
import { newId } from "../utils/ids";
const listeners = new Set<() => void>();
export const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};
export const changed = () => listeners.forEach((f) => f());
export async function all(
  type: EntityType,
  userId: string,
  tx?: SQLiteDatabase,
): Promise<Entity[]> {
  const db = tx ?? (await database());
  const rows = await db.getAllAsync<{ data: string }>(
    `SELECT data FROM ${tables[type]} WHERE owner_user_id=? AND deleted_at IS NULL`,
    userId,
  );
  return rows.map((r) => entitySchema.parse(JSON.parse(r.data)));
}
export async function find(
  type: EntityType,
  id: string,
  userId: string,
  tx?: SQLiteDatabase,
) {
  const db = tx ?? (await database());
  const row = await db.getFirstAsync<{ data: string }>(
    `SELECT data FROM ${tables[type]} WHERE owner_user_id=? AND id=? AND deleted_at IS NULL`,
    userId,
    id,
  );
  return row ? entitySchema.parse(JSON.parse(row.data)) : null;
}
export async function put(
  tx: SQLiteDatabase,
  type: EntityType,
  entity: Entity,
  status: "pending" | "synced" | "conflict",
) {
  await tx.runAsync(
    `INSERT INTO ${tables[type]}(id,owner_user_id,data,version,updated_at,deleted_at,sync_status) VALUES(?,?,?,?,?,?,?) ON CONFLICT(owner_user_id,id) DO UPDATE SET data=excluded.data,version=excluded.version,updated_at=excluded.updated_at,deleted_at=excluded.deleted_at,sync_status=excluded.sync_status`,
    entity.id,
    entity.userId,
    JSON.stringify(entity),
    entity.version,
    entity.updatedAt,
    entity.deletedAt,
    status,
  );
}
export async function enqueue(tx: SQLiteDatabase, userId: string, m: Mutation) {
  await tx.runAsync(
    "INSERT INTO sync_outbox(id,owner_user_id,entity_type,entity_id,operation,base_version,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?)",
    m.clientMutationId,
    userId,
    m.entityType,
    m.entityId,
    m.operation,
    m.baseVersion,
    JSON.stringify(m.payload),
    new Date().toISOString(),
  );
}
export async function save(
  type: EntityType,
  userId: string,
  input: Record<string, unknown>,
  id?: string,
) {
  const db = await database();
  const entityId = id ?? newId();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const previous = id ? await find(type, id, userId, tx) : null;
    if (id && !previous) throw new Error("Élément introuvable");
    const defaults =
      type === "course" ? { status: "draft", studiedAt: null } : {};
    let courseLifecycle: Record<string, unknown> = {};
    if (type === "course") {
      if (input.archivedAt) courseLifecycle = { status: "archived" };
      else if (previous?.status === "archived") {
        const row = await tx.getFirstAsync<{ data: string }>(
          "SELECT data FROM review_plans WHERE owner_user_id=? AND course_id=? AND deleted_at IS NULL",
          userId,
          entityId,
        );
        const plan = row ? entitySchema.parse(JSON.parse(row.data)) : null;
        courseLifecycle = {
          status: plan?.status === "completed" ? "completed" : plan ? "active" : "draft",
        };
      }
    }
    const entity = entitySchema.parse({
      ...defaults,
      ...previous,
      ...input,
      ...courseLifecycle,
      id: entityId,
      userId,
      version: previous ? previous.version + 1 : 1,
      createdAt: previous?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });
    await put(tx, type, entity, "pending");
    await enqueue(tx, userId, {
      clientMutationId: newId(),
      entityType: type,
      entityId,
      operation: previous ? "update" : "create",
      baseVersion: previous?.version ?? null,
      payload: input,
    });
  });
  changed();
  return entityId;
}
export async function remove(type: EntityType, id: string, userId: string) {
  const db = await database();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const e = await find(type, id, userId, tx);
    if (!e) return;
    await put(
      tx,
      type,
      {
        ...e,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: e.version + 1,
      },
      "pending",
    );
    await enqueue(tx, userId, {
      clientMutationId: newId(),
      entityType: type,
      entityId: id,
      operation: "delete",
      baseVersion: e.version,
      payload: {},
    });
  });
  changed();
}
export async function wipeUser(userId: string) {
  const db = await database();
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const table of [
      ...Object.values(tables),
      "sync_outbox",
      "sync_metadata",
      "server_shadow",
      "sync_conflicts",
      "daily_progress",
      "study_timers",
    ])
      await tx.runAsync(`DELETE FROM ${table} WHERE owner_user_id=?`, userId);
  });
  changed();
}
