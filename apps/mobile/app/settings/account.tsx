import React, { useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { ArrowLeft01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import {
  Screen,
  Label,
  Card,
  Button,
  IconButton,
  Field,
  ErrorText,
  useAction,
  usePalette,
} from "../../src/ui/components";
import { useAuth } from "../../src/auth/AuthProvider";

export default function Account() {
  const auth = useAuth();
  const a = useAction();
  const c = usePalette();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [text, setText] = useState("");

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton
          icon={ArrowLeft01Icon}
          accessibilityLabel="Retour"
          onPress={() => router.back()}
        />
        <Label large>Compte et données</Label>
      </View>

      <Card style={{ padding: 16, gap: 12, borderColor: c.dangerSoft }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: c.danger }}>
          Suppression du compte
        </Text>
        <Text style={{ fontSize: 14, color: c.textSecondary, lineHeight: 20 }}>
          Tes matières, cours, historiques, révisions et données cloud seront
          supprimés définitivement.
        </Text>

        {confirmDelete ? (
          <View style={{ gap: 10, marginTop: 4 }}>
            <Field
              label="Écris SUPPRIMER pour confirmer"
              autoCapitalize="characters"
              value={text}
              onChangeText={setText}
            />
            <Button
              fullWidth
              size="md"
              variant="destructive"
              icon={Delete02Icon}
              title="Supprimer définitivement"
              disabled={text !== "SUPPRIMER" || a.busy}
              onPress={() => void a.run(auth.deleteAccount)}
            />
          </View>
        ) : (
          <Button
            size="md"
            variant="destructive"
            title="Supprimer mon compte"
            onPress={() => setConfirmDelete(true)}
          />
        )}
      </Card>

      <ErrorText message={a.error} />
    </Screen>
  );
}

