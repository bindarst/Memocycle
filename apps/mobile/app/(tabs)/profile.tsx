import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Image, Linking } from "react-native";
import Constants from "expo-constants";
import {
  Screen,
  Label,
  Card,
  Button,
  ErrorText,
  useAction,
} from "../../src/ui/components";
import { useAuth } from "../../src/auth/AuthProvider";
import { currentSession } from "../../src/auth/authService";
import { database } from "../../src/database/database";
import { subscribe } from "../../src/database/repository";
import { pendingCount } from "../../src/sync/outboxService";
export default function Profile() {
  const auth = useAuth();
  const a = useAction();
  const [pending, setPending] = useState(0);
  const [conflicts, setConflicts] = useState(0);
  const [synced, setSynced] = useState(false);
  const [imageError, setImageError] = useState(false);
  const user = currentSession()?.user;
  useEffect(() => {
    const load = () => {
      void pendingCount(auth.userId).then(setPending);
      void database().then(async (db) => {
        setConflicts(
          (
            await db.getFirstAsync<{ n: number }>(
              "SELECT COUNT(*) n FROM sync_conflicts WHERE owner_user_id=?",
              auth.userId,
            )
          )?.n ?? 0,
        );
        setSynced(
          !!(await db.getFirstAsync(
            "SELECT last_synced_at FROM sync_metadata WHERE owner_user_id=?",
            auth.userId,
          )),
        );
      });
    };
    load();
    return subscribe(load);
  }, [auth.userId]);
  return (
    <Screen>
      <Label large>Profil</Label>
      <Card>
        {user?.avatarUrl && !imageError ? (
          <Image
            source={{ uri: user.avatarUrl }}
            style={{ width: 64, height: 64, borderRadius: 32 }}
            onError={() => setImageError(true)}
          />
        ) : (
          <Label large>{user?.displayName?.slice(0, 1) ?? "M"}</Label>
        )}
        <Label>{user?.displayName ?? "Mon compte"}</Label>
        <Label muted>{user?.email}</Label>
        <Label muted>
          {user?.subscriptionTier === "pro" ? "Compte Pro" : "Compte gratuit"}
        </Label>
      </Card>
      <Label large>Études</Label>
      <Button
        secondary
        title="Statistiques"
        onPress={() => router.push("/stats")}
      />
      <Button
        secondary
        title="Temps de révision quotidien"
        onPress={() => router.push("/settings/study")}
      />
      <Label large>Préférences</Label>
      <Button
        secondary
        title="Notifications"
        onPress={() => router.push("/settings/notifications")}
      />
      <Button
        secondary
        title="Apparence"
        onPress={() => router.push("/settings/appearance")}
      />
      <Label large>Données et synchronisation</Label>
      <Card>
        <Label>Synchronisation</Label>
        <Label muted>
          {pending
            ? `${pending} modifications en attente`
            : synced
              ? "À jour"
              : "Données locales"}
        </Label>
        {conflicts > 0 && (
          <Label muted>
            {conflicts} modification(s) en conflit conservée(s) sur cet
            appareil. La version du serveur a été retenue.
          </Label>
        )}
        <ErrorText message={auth.error} />
        <Button
          secondary
          title="Synchroniser maintenant"
          disabled={a.busy}
          onPress={() => void a.run(auth.synchronize)}
        />
      </Card>
      <Label large>Sécurité</Label>
      <Button
        secondary
        title="Appareils connectés"
        onPress={() => router.push("/settings/devices")}
      />
      <Button
        secondary
        title="Compte et suppression"
        onPress={() => router.push("/settings/account")}
      />
      <Label large>Aide et à propos</Label>
      <Button
        secondary
        title="Confidentialité"
        onPress={() =>
          void Linking.openURL(
            `${process.env.EXPO_PUBLIC_LEGAL_URL ?? "https://memocycle.app"}/privacy`,
          )
        }
      />
      <Label muted>MémoCycle {Constants.expoConfig?.version ?? "1.0.0"}</Label>
      <Button
        secondary
        title="Conditions d’utilisation"
        onPress={() =>
          void Linking.openURL(
            `${process.env.EXPO_PUBLIC_LEGAL_URL ?? "https://memocycle.app"}/terms`,
          )
        }
      />
      <Button
        secondary
        title="Se déconnecter"
        disabled={a.busy}
        onPress={() => void a.run(auth.logout)}
      />
      <ErrorText message={a.error} />
    </Screen>
  );
}
