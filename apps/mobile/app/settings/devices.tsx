import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { View, Text } from "react-native";
import {
  ArrowLeft01Icon,
  SmartphoneIcon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";
import { z } from "zod";
import {
  Screen,
  Label,
  Card,
  Button,
  IconButton,
  Pill,
  ErrorText,
  useAction,
  confirm,
  usePalette,
} from "../../src/ui/components";
import { AppIcon } from "../../src/ui/Icon";
import { api } from "../../src/auth/authService";
import { useAuth } from "../../src/auth/AuthProvider";

const schema = z.array(
  z.object({
    id: z.string().uuid(),
    deviceName: z.string().nullable(),
    platform: z.string(),
    lastSeenAt: z.string(),
    current: z.boolean(),
  }),
);

export default function Devices() {
  const auth = useAuth();
  const a = useAction();
  const c = usePalette();
  const [devices, setDevices] = useState<z.infer<typeof schema>>([]);

  const load = async () =>
    setDevices(schema.parse(await api("/devices", undefined, "GET")));

  useEffect(() => {
    void a.run(load);
  }, []);

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton
          icon={ArrowLeft01Icon}
          accessibilityLabel="Retour"
          onPress={() => router.back()}
        />
        <Label large>Appareils connectés</Label>
      </View>

      <View style={{ gap: 8 }}>
        {devices.map((d) => (
          <Card
            key={d.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                flex: 1,
              }}
            >
              <AppIcon icon={SmartphoneIcon} color={c.primary} size={20} />
              <View style={{ gap: 2, flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: c.textPrimary,
                    }}
                    numberOfLines={1}
                  >
                    {d.deviceName ?? d.platform}
                  </Text>
                  {d.current && <Pill tone="primary">Cet appareil</Pill>}
                </View>
                <Text style={{ fontSize: 12, color: c.textSecondary }}>
                  Activité : {new Date(d.lastSeenAt).toLocaleDateString("fr-FR")}
                </Text>
              </View>
            </View>

            <Button
              size="sm"
              variant="ghost"
              title="Déconnecter"
              onPress={() =>
                confirm(
                  "Déconnecter cet appareil ?",
                  "Il devra se reconnecter pour synchroniser ses données.",
                  () =>
                    void a.run(async () => {
                      if (d.current) await auth.logout();
                      else {
                        await api(`/devices/${d.id}`, undefined, "DELETE");
                        await load();
                      }
                    }),
                )
              }
            />
          </Card>
        ))}
      </View>

      {devices.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Button
            size="md"
            variant="destructive"
            icon={Logout01Icon}
            title="Déconnecter tous les appareils"
            onPress={() =>
              confirm(
                "Déconnecter tous les appareils ?",
                "Chaque appareil devra se reconnecter.",
                () => void a.run(auth.logoutAll),
              )
            }
          />
        </View>
      )}

      <ErrorText message={a.error} />
    </Screen>
  );
}

