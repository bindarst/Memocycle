import * as SecureStore from "expo-secure-store";
import { z } from "zod";
import { authResponseSchema } from "@memocycle/contracts";
const schema = authResponseSchema.extend({
  lastVerifiedAt: z.string().datetime(),
  currentUserId: z.string().uuid(),
});
export type StoredSession = z.infer<typeof schema>;
const key = "memocycle.session.v1";
export async function saveSession(session: StoredSession) {
  await SecureStore.setItemAsync(key, JSON.stringify(schema.parse(session)), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}
export async function loadSession() {
  const value = await SecureStore.getItemAsync(key);
  if (!value) return null;
  let decoded:unknown;
  try { decoded=JSON.parse(value); } catch { return null; }
  const parsed = schema.safeParse(decoded);
  if (!parsed.success || parsed.data.currentUserId !== parsed.data.user.id)
    return null;
  return parsed.data;
}
export async function clearSession() {
  await SecureStore.deleteItemAsync(key);
}
