import NetInfo from "@react-native-community/netinfo";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { authResponseSchema, type AuthState } from "@memocycle/contracts";
import { newId } from "../utils/ids";
import { offlineAllowed } from './offlinePolicy';
export { offlineAllowed } from './offlinePolicy';
import {
  saveSession,
  loadSession,
  clearSession,
  type StoredSession,
} from "./tokenStorage";
export class ApiError extends Error {
  constructor(public status: number) {
    super(
      status === 401
        ? "Reconnecte-toi pour continuer."
        : "Le serveur est momentanément indisponible.",
    );
  }
}
let session: StoredSession | null = null;
let refreshInFlight: Promise<StoredSession> | null = null;
export const currentSession = () => session;
export async function request(
  path: string,
  body?: unknown,
  token?: string,
  method = "POST",
) {
  const base = process.env.EXPO_PUBLIC_API_URL;
  if (
    !base ||
    (!base.startsWith("https://") &&
      !(
        typeof __DEV__ !== "undefined" &&
        __DEV__ &&
        base.startsWith("http://")
      ))
  )
    throw new Error("Adresse API non configurée");
  const response = await fetch(`${base}/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<unknown>;
}
export async function refresh() {
  if (refreshInFlight) return refreshInFlight;
  const previous = session;
  if (!previous) throw new ApiError(401);
  refreshInFlight = (async () => {
    const result = authResponseSchema.parse(
      await request("/auth/refresh", { refreshToken: previous.refreshToken }),
    );
    if (session?.currentUserId !== previous.currentUserId)
      throw new ApiError(401);
    const next = {
      ...result,
      currentUserId: result.user.id,
      lastVerifiedAt: new Date().toISOString(),
    };
    await saveSession(next);
    session = next;
    return next;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}
export async function api(path: string, body?: unknown, method = "POST") {
  if (!session) throw new ApiError(401);
  if (new Date(session.accessTokenExpiresAt).getTime() < Date.now() + 30000)
    await refresh();
  try {
    return await request(path, body, session!.accessToken, method);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await refresh();
      return request(path, body, session!.accessToken, method);
    }
    throw e;
  }
}
export async function bootstrapAuth(): Promise<AuthState> {
  session = await loadSession();
  if (!session) return "unauthenticated";
  // Local verified session unlocks immediately. Network verification follows in the background.
  if (offlineAllowed(session)) return "offline_authenticated";
  try {
    const network = await NetInfo.fetch();
    if (!network.isConnected) return "unauthenticated";
    await refresh();
    return "authenticated";
  } catch {
    return "unauthenticated";
  }
}
export async function authenticate(
  provider: "google" | "apple",
  identity: { idToken: string; nonce?: string; displayName?: string },
) {
  let installationId = await SecureStore.getItemAsync("memocycle.installation");
  if (!installationId) {
    installationId = newId();
    await SecureStore.setItemAsync("memocycle.installation", installationId);
  }
  const response = authResponseSchema.parse(
    await request(`/auth/${provider}`, {
      ...identity,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      device: {
        installationId,
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version ?? "1.0.0",
        deviceName: Constants.deviceName ?? undefined,
      },
    }),
  );
  session = {
    ...response,
    currentUserId: response.user.id,
    lastVerifiedAt: new Date().toISOString(),
  };
  await saveSession(session);
  return session;
}
export async function forgetSession() {
  session = null;
  await clearSession();
}
