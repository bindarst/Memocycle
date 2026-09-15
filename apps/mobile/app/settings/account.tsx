import { useState } from "react";
import { router } from "expo-router";
import {
  Screen,
  Label,
  Button,
  Field,
  ErrorText,
  useAction,
} from "../../src/ui/components";
import { useAuth } from "../../src/auth/AuthProvider";
export default function Account() {
  const auth = useAuth();
  const a = useAction();
  const [confirm, setConfirm] = useState(false);
  const [text, setText] = useState("");
  return (
    <Screen>
      <Button secondary title="Retour" onPress={() => router.back()} />
      <Label large>Supprimer le compte</Label>
      <Label>
        Tes matières, cours, historiques, révisions et données cloud seront
        supprimés. Cette action est définitive.
      </Label>
      {confirm ? (
        <>
          <Field
            label="Écris SUPPRIMER pour confirmer"
            autoCapitalize="characters"
            value={text}
            onChangeText={setText}
          />
          <Button
            danger
            title="Supprimer définitivement mon compte"
            disabled={text !== "SUPPRIMER" || a.busy}
            onPress={() => void a.run(auth.deleteAccount)}
          />
        </>
      ) : (
        <Button danger title="Continuer" onPress={() => setConfirm(true)} />
      )}
      <ErrorText message={a.error} />
    </Screen>
  );
}
