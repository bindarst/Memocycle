import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { Image, Linking, View, Text } from "react-native";
import Constants from "expo-constants";
import {
  Analytics01Icon,
  Clock01Icon,
  Notification01Icon,
  PaintBoardIcon,
  AiPhone01Icon,
  Shield01Icon,
  Logout01Icon,
  RefreshIcon,
  Calendar01Icon,
  HelpCircleIcon,
} from "@hugeicons/core-free-icons";
import { isDeviceCalendarConnected } from "../../src/calendar/localCalendarService";
import {
  Screen,
  Label,
  Card,
  Button,
  ListRow,
  ErrorText,
  useAction,
  usePalette,
  SectionTitle,
} from "../../src/ui/components";
import { useAuth } from "../../src/auth/AuthProvider";
import { currentSession } from "../../src/auth/authService";
import { privacyUrl } from "../../src/config/publicLinks";
import { database } from "../../src/database/database";
import { subscribe } from "../../src/database/repository";
import { pendingCount } from "../../src/sync/outboxService";

export default function Profile() {
  const auth = useAuth();
  const a = useAction();
  const c = usePalette();
  const [pending, setPending] = useState(0);
  const [conflicts, setConflicts] = useState(0);
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
      });
    };
    load();
    return subscribe(load);
  }, [auth.userId]);

  return (
    <Screen>
      <Label large>Profil</Label>

      {/* User Info Card */}
      <Card style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          {user?.avatarUrl && !imageError ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={{ width: 44, height: 44, borderRadius: 22 }}
              onError={() => setImageError(true)}
            />
          ) : (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: c.primarySoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: c.primary }}
              >
                {user?.displayName?.slice(0, 1) ?? "M"}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: c.textPrimary,
              }}
            >
              {user?.displayName ?? "Mon compte"}
            </Text>
            <Text style={{ fontSize: 13, color: c.textSecondary }}>
              {user?.email}
            </Text>
          </View>
        </View>
      </Card>

      {/* Sync alert only if pending or conflicts */}
      {(pending > 0 || conflicts > 0) && (
        <Card style={{ padding: 12, gap: 8 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 13, color: c.textSecondary }}>
              {pending > 0 ? `${pending} modif. en attente` : "Conflits détectés"}
            </Text>
            <Button
              size="sm"
              variant="secondary"
              icon={RefreshIcon}
              title="Synchroniser"
              disabled={a.busy}
              onPress={() => void a.run(auth.synchronize)}
            />
          </View>
        </Card>
      )}

      {/* Section Études */}
      <SectionTitle title="Études" />
      <View style={{ gap: 6 }}>
        <ListRow
          icon={Analytics01Icon}
          title="Statistiques"
          showChevron
          onPress={() => router.push("/stats")}
        />
        <ListRow
          icon={Clock01Icon}
          title="Temps quotidien"
          showChevron
          onPress={() => router.push("/settings/study")}
        />
      </View>

      {/* Section Préférences */}
      <SectionTitle title="Préférences" />
      <View style={{ gap: 6 }}>
        <ListRow
          icon={Notification01Icon}
          title="Notifications"
          showChevron
          onPress={() => router.push("/settings/notifications")}
        />
        <ListRow
          icon={PaintBoardIcon}
          title="Apparence"
          showChevron
          onPress={() => router.push("/settings/appearance")}
        />
        <ListRow
          icon={Calendar01Icon}
          title="Calendriers"
          subtitle={isDeviceCalendarConnected() ? "Téléphone" : undefined}
          showChevron
          onPress={() => router.push("/settings/calendar")}
        />
      </View>

      {/* Section Sécurité */}
      <SectionTitle title="Sécurité" />
      <View style={{ gap: 6 }}>
        <ListRow
          icon={AiPhone01Icon}
          title="Appareils connectés"
          showChevron
          onPress={() => router.push("/settings/devices")}
        />
        <ListRow
          icon={Shield01Icon}
          title="Compte et données"
          showChevron
          onPress={() => router.push("/settings/account")}
        />
      </View>

      <SectionTitle title="Aide" />
      <View style={{ gap: 6 }}>
        <ListRow
          icon={HelpCircleIcon}
          title="Aide et FAQ"
          subtitle="Guide complet, recherche et dépannage"
          showChevron
          onPress={() => router.push("/settings/help")}
        />
        <ListRow
          icon={Shield01Icon}
          title="Politique de confidentialité"
          showChevron
          onPress={() => void a.run(() => Linking.openURL(privacyUrl).then(() => undefined))}
        />
      </View>

      <ErrorText message={a.error} />

      {/* Logout button & Version footer */}
      <View style={{ alignItems: "center", gap: 12, marginTop: 8 }}>
        <Button
          size="md"
          variant="destructive"
          icon={Logout01Icon}
          title="Se déconnecter"
          disabled={a.busy}
          onPress={() => void a.run(auth.logout)}
        />
        <Text style={{ fontSize: 12, color: c.textSecondary }}>
          MémoCycle v{Constants.expoConfig?.version ?? "1.0.0"}
        </Text>
      </View>
    </Screen>
  );
}
