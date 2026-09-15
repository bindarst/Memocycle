import { router } from "expo-router";
import { Screen, Label, Card, Button } from "../src/ui/components";

export default function Paywall() {
  return (
    <Screen>
      <Button secondary title="Retour" onPress={() => router.back()} />
      <Label large>MémoCycle Pro</Label>
      <Card>
        <Label>Aucune offre payante n’est disponible actuellement.</Label>
        <Label muted>
          Les révisions, les rappels, le mode hors connexion et l’historique
          restent accessibles gratuitement.
        </Label>
      </Card>
    </Screen>
  );
}
