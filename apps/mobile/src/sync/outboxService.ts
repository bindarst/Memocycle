import type { SQLiteDatabase } from "expo-sqlite";
import { mutationSchema } from "@memocycle/contracts";
import { database } from "../database/database";
export interface OutboxRow {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  base_version: number | null;
  payload_json: string;
}
export const asMutation = (r: OutboxRow) =>
  mutationSchema.parse({
    clientMutationId: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    operation: r.operation,
    baseVersion: r.base_version,
    payload: JSON.parse(r.payload_json),
  });
export async function pendingCount(userId: string, tx?: SQLiteDatabase) {
  return (
    (
      await (tx ?? (await database())).getFirstAsync<{ n: number }>(
        "SELECT COUNT(*) n FROM sync_outbox WHERE owner_user_id=?",
        userId,
      )
    )?.n ?? 0
  );
}
