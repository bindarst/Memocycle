import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { type AuthState } from "@memocycle/contracts";
import { database } from "../database/database";
import { all, subscribe, wipeUser } from "../database/repository";
import { settingsSchema } from "../database/entities";
import {
  api,
  bootstrapAuth,
  currentSession,
  authenticate,
  refresh,
  ApiError,
  forgetSession,
  offlineAllowed,
} from "./authService";
import { sync, waitForSync } from "../sync/syncService";
import { pendingCount } from "../sync/outboxService";
import {
  cancelAll,
  initializeNotifications,
} from "../notifications/notificationService";
import { syncScheduledNotifications,waitForNotifications } from "../notifications/notificationSyncService";
type Context = {
  state: AuthState;
  userId: string;
  onboarded: boolean;
  error: string;
  signIn: (
    provider: "google" | "apple",
    identity: { idToken: string; nonce?: string; displayName?: string },
  ) => Promise<void>;
  synchronize: () => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};
const AuthContext = createContext<Context | null>(null);
export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error("Auth provider missing");
  return c;
};
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>("booting");
  const [error, setError] = useState("");
  const [onboarded, setOnboarded] = useState(false);
  const [userId, setUserId] = useState("");
  const readOnboarding = useCallback(async (id: string) => {
    const settings = (await all("userSettings", id))[0];
    setOnboarded(
      settings
        ? settingsSchema.parse(settings).onboardingCompleted
        : (currentSession()?.user.onboardingCompleted ?? false),
    );
  }, []);
  const synchronize = useCallback(async () => {
    if (!currentSession()) return;
    try {
      await sync();
      setError("");
      setState("authenticated");
      await syncScheduledNotifications(currentSession()!.currentUserId);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setState("unauthenticated");
        await cancelAll();
      } else {
        setError(
          "Impossible de synchroniser pour le moment. Tes modifications sont conservées sur cet appareil.",
        );
      }
      throw e;
    }
  }, []);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const s = await bootstrapAuth();
        await database();
        await initializeNotifications();
        const id = currentSession()?.currentUserId ?? "";
        if (id) await readOnboarding(id);
        if (active) {
          setUserId(id);
          setState(s);
        }
      } catch {
        if (active) {
          setError(
            "Impossible d’ouvrir les données. Ferme et rouvre MémoCycle.",
          );
          setState("unauthenticated");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [readOnboarding]);
  useEffect(() => {
    if (!userId || state === "booting" || state === "unauthenticated") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const online = async () => {
      if (disposed) return;
      const value = currentSession();
      if (!value) return;
      try {
        const network = await NetInfo.fetch();
        if (!network.isConnected) {
          setState(
            offlineAllowed(value) ? "offline_authenticated" : "unauthenticated",
          );
          return;
        }
        await refresh();
        if (!disposed) await synchronize();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          setState("unauthenticated");
          await cancelAll();
        } else if (!offlineAllowed(value)) setState("unauthenticated");
      }
    };
    const stopNetwork = NetInfo.addEventListener((n) => {
      if (timer) clearTimeout(timer);
      if (n.isConnected) timer = setTimeout(() => void online(), 1500);
      else
        setState(
          currentSession() && offlineAllowed(currentSession()!)
            ? "offline_authenticated"
            : "unauthenticated",
        );
    });
    const stopData = subscribe(() => {
      void readOnboarding(userId);
      void syncScheduledNotifications(userId).catch(() => {});
      void pendingCount(userId).then((n) => {
        if (n > 0) {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => void synchronize().catch(() => {}), 1500);
        }
      });
    });
    const app = AppState.addEventListener("change", (s) => {
      if (s === "active") void online();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === "active")
        void synchronize().catch(() => {});
    }, 60_000);
    void syncScheduledNotifications(userId).catch(() => {});
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      stopNetwork();
      stopData();
      app.remove();
    };
  }, [
    userId,
    state === "unauthenticated",
    state === "booting",
    readOnboarding,
    synchronize,
  ]);
  async function signIn(
    provider: "google" | "apple",
    identity: { idToken: string; nonce?: string; displayName?: string },
  ) {
    const value = await authenticate(provider, identity);
    await sync();
    setUserId(value.currentUserId);
    await readOnboarding(value.currentUserId);
    setError("");
    setState("authenticated");
  }
  async function clearLocal() {
    await forgetSession();
    await waitForNotifications();
    await cancelAll();
    await wipeUser(userId);
    setState("unauthenticated");
    setUserId("");
    setOnboarded(false);
  }
  async function logout() {
    await waitForSync();
    try {
      await synchronize();
    } catch {
      if (await pendingCount(userId))
        throw new Error(
          "Certaines modifications ne sont pas encore sauvegardées. Connecte-toi à Internet avant de te déconnecter.",
        );
      throw new Error(
        "Connecte-toi à Internet pour déconnecter cet appareil en toute sécurité.",
      );
    }
    if (await pendingCount(userId))
      throw new Error(
        "Certaines modifications ne sont pas encore sauvegardées. Connecte-toi à Internet avant de te déconnecter.",
      );
    await api("/auth/logout");
    await clearLocal();
  }
  async function logoutAll() {
    await waitForSync();
    try {
      await synchronize();
    } catch {
      throw new Error(
        "Connecte-toi à Internet pour déconnecter tous les appareils en toute sécurité.",
      );
    }
    if (await pendingCount(userId))
      throw new Error(
        "Connecte-toi à Internet pour sauvegarder tes modifications avant de te déconnecter.",
      );
    await api("/auth/logout-all");
    await clearLocal();
  }
  async function deleteAccount() {
    await waitForSync();
    await api("/account", { confirmation: "SUPPRIMER" }, "DELETE");
    await clearLocal();
  }
  return (
    <AuthContext.Provider
      value={{
        state,
        userId,
        onboarded,
        error,
        signIn,
        synchronize,
        logout,
        logoutAll,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
