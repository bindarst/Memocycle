import {
  syncResponseSchema,
  entitySchema,
  entityTypeSchema,
  reviewCommandSchema,
  type SyncResponse,
} from "@memocycle/contracts";
import { api, currentSession } from "../auth/authService";
import { database } from "../database/database";
import { put, changed } from "../database/repository";
import { tables } from "../database/schema";
import { asMutation, type OutboxRow } from "./outboxService";
let inFlight: Promise<void> | null = null;
let rerunRequested = false;
export function sync() {
  if (inFlight) {
    rerunRequested = true;
    return inFlight;
  }
  inFlight = (async () => {
    do {
      rerunRequested = false;
      await run();
    } while (rerunRequested);
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
export const waitForSync = () => inFlight ?? Promise.resolve();
async function run() {
  const userId = currentSession()?.currentUserId;
  if (!userId) return;
  const db = await database();
  for (let page = 0; page < 1000; page++) {
    if (currentSession()?.currentUserId !== userId) return;
    const row = await db.getFirstAsync<OutboxRow>(
      "SELECT * FROM sync_outbox WHERE owner_user_id=? ORDER BY rowid LIMIT 1",
      userId,
    );
    const meta = await db.getFirstAsync<{ cursor: string | null }>(
      "SELECT cursor FROM sync_metadata WHERE owner_user_id=?",
      userId,
    );
    let response: SyncResponse;
    try {
      response = syncResponseSchema.parse(
        await api("/sync", {
          cursor: meta?.cursor ?? null,
          mutations: row ? [asMutation(row)] : [],
        }),
      );
    } catch (error) {
      if (row)
        await db.runAsync(
          "UPDATE sync_outbox SET retry_count=retry_count+1,last_error=? WHERE owner_user_id=? AND id=?",
          "network_or_server_error",
          userId,
          row.id,
        );
      throw error;
    }
    if (currentSession()?.currentUserId !== userId) return;
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync("PRAGMA defer_foreign_keys = ON");
      for (const result of response.mutationResults) {
        if (!row || row.id !== result.clientMutationId)
          throw new Error("Confirmation inconnue");
        if (result.status !== "accepted") {
          const siblings = await tx.getAllAsync<OutboxRow>(
            "SELECT * FROM sync_outbox WHERE owner_user_id=? AND entity_type=? AND entity_id=?",
            userId,
            row.entity_type,
            row.entity_id,
          );
          for (const failed of siblings) {
            await tx.runAsync(
              "INSERT OR IGNORE INTO sync_conflicts(id,owner_user_id,mutation_json,reason,created_at) VALUES(?,?,?,?,?)",
              failed.id,
              userId,
              JSON.stringify(asMutation(failed)),
              result.reason ?? "Conflit",
              new Date().toISOString(),
            );
            if (failed.operation === "command") {
              const command = reviewCommandSchema.parse(
                JSON.parse(failed.payload_json),
              );
              await tx.runAsync(
                "DELETE FROM review_events WHERE owner_user_id=? AND id=? AND sync_status='pending'",
                userId,
                command.eventId,
              );
            }
            await tx.runAsync(
              "DELETE FROM sync_outbox WHERE owner_user_id=? AND id=?",
              userId,
              failed.id,
            );
          }
          // Keep rejected creates in the local library, clearly marked, so content can be recovered.
          await tx.runAsync(
            `UPDATE ${tables[entityTypeSchema.parse(row.entity_type)]} SET sync_status='conflict' WHERE owner_user_id=? AND id=?`,
            userId,
            row.entity_id,
          );
        } else
          await tx.runAsync(
            "DELETE FROM sync_outbox WHERE owner_user_id=? AND id=?",
            userId,
            row.id,
          );
        if (result.entity) {
          if (result.entity.userId !== userId)
            throw new Error("Compte incohérent");
          await tx.runAsync(
            "INSERT INTO server_shadow(owner_user_id,entity_type,entity_id,data) VALUES(?,?,?,?) ON CONFLICT(owner_user_id,entity_type,entity_id) DO UPDATE SET data=excluded.data,needs_apply=1 WHERE json_extract(excluded.data,'$.version') > json_extract(server_shadow.data,'$.version') OR (json_extract(excluded.data,'$.version') = json_extract(server_shadow.data,'$.version') AND json_extract(excluded.data,'$.updatedAt') >= json_extract(server_shadow.data,'$.updatedAt'))",
            userId,
            row.entity_type,
            result.entity.id,
            JSON.stringify(result.entity),
          );
        }
      }
      // Store the mutation result first. Cursor changes are ordered, so a concurrent
      // server update with the same entity version and a later timestamp wins.
      for (const change of response.changes) {
        if (change.entity.userId !== userId)
          throw new Error("Réponse de synchronisation invalide");
        await tx.runAsync(
          "INSERT INTO server_shadow(owner_user_id,entity_type,entity_id,data) VALUES(?,?,?,?) ON CONFLICT(owner_user_id,entity_type,entity_id) DO UPDATE SET data=excluded.data,needs_apply=1 WHERE json_extract(excluded.data,'$.version') > json_extract(server_shadow.data,'$.version') OR (json_extract(excluded.data,'$.version') = json_extract(server_shadow.data,'$.version') AND json_extract(excluded.data,'$.updatedAt') >= json_extract(server_shadow.data,'$.updatedAt'))",
          userId,
          change.entityType,
          change.entity.id,
          JSON.stringify(change.entity),
        );
      }
      const shadows = await tx.getAllAsync<{
        entity_type: string;
        entity_id: string;
        data: string;
      }>(
        "SELECT * FROM server_shadow WHERE owner_user_id=? AND needs_apply=1 ORDER BY CASE entity_type WHEN 'subject' THEN 0 WHEN 'module' THEN 1 WHEN 'course' THEN 2 WHEN 'exam' THEN 3 WHEN 'reviewPlan' THEN 4 WHEN 'reviewEvent' THEN 5 ELSE 6 END",
        userId,
      );
      for (const shadow of shadows) {
        const type = entityTypeSchema.parse(shadow.entity_type);
        const entity = entitySchema.parse(JSON.parse(shadow.data));
        // Commands also modify the course. Preserve that optimistic state while its command is pending.
        const pending = await tx.getFirstAsync(
          "SELECT id FROM sync_outbox WHERE owner_user_id=? AND ((entity_type=? AND entity_id=?) OR (operation='command' AND json_extract(payload_json,'$.courseId')=?)) LIMIT 1",
          userId,
          type,
          entity.id,
          type === "course" ? entity.id : "",
        );
        if (!pending) {
          let deletedParent = false;
          for (const [key, parentType] of [
            ["subjectId", "subject"],
            ["moduleId", "module"],
            ["courseId", "course"],
          ] as const) {
            if (typeof entity[key] !== "string") continue;
            const parent = await tx.getFirstAsync<{ data: string }>(
              "SELECT data FROM server_shadow WHERE owner_user_id=? AND entity_type=? AND entity_id=?",
              userId,
              parentType,
              entity[key] as string,
            );
            if (parent && entitySchema.parse(JSON.parse(parent.data)).deletedAt)
              deletedParent = true;
          }
          if (deletedParent || entity.deletedAt)
            await tx.runAsync(
              `DELETE FROM ${tables[type]} WHERE owner_user_id=? AND id=?`,
              userId,
              entity.id,
            );
          else await put(tx, type, entity, "synced");
          await tx.runAsync(
            "UPDATE server_shadow SET needs_apply=0 WHERE owner_user_id=? AND entity_type=? AND entity_id=?",
            userId,
            type,
            entity.id,
          );
        }
      }
      await tx.runAsync(
        "INSERT INTO sync_metadata(owner_user_id,cursor,last_synced_at) VALUES(?,?,?) ON CONFLICT(owner_user_id) DO UPDATE SET cursor=excluded.cursor,last_synced_at=excluded.last_synced_at",
        userId,
        response.cursor,
        new Date().toISOString(),
      );
    });
    changed();
    if (!row && !response.hasMore) return;
  }
  throw new Error("La synchronisation reprendra au prochain passage.");
}
