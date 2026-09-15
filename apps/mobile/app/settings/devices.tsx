import { useEffect, useState } from "react";
import { router } from "expo-router";
import { z } from "zod";
import {
  Screen,
  Label,
  Card,
  Button,
  ErrorText,
  useAction,
  confirm,
} from "../../src/ui/components";
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
  const [devices, setDevices] = useState<z.infer<typeof schema>>([]);
  const load = async () =>
    setDevices(schema.parse(await api("/devices", undefined, "GET")));
  useEffect(() => {
    void a.run(load);
  }, []);
  return (
    <Screen>
      <Button secondary title="Retour" onPress={() => router.back()} />
      <Label large>Appareils connectés</Label>
      {devices.map((d) => (
        <Card key={d.id}>
          <Label>
            {d.deviceName ?? d.platform}
            {d.current ? " · Cet appareil" : ""}
          </Label>
          <Label muted>
            Dernière activité : {new Date(d.lastSeenAt).toLocaleString("fr-BE")}
          </Label>
          <Button
            secondary
            title="Déconnecter cet appareil"
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
      {devices.length > 0 && (
        <Button
          danger
          title="Déconnecter tous les appareils"
          onPress={() =>
            confirm(
              "Déconnecter tous les appareils ?",
              "Chaque appareil devra se reconnecter.",
              () => void a.run(auth.logoutAll),
            )
          }
        />
      )}
      <ErrorText message={a.error} />
    </Screen>
  );
}
