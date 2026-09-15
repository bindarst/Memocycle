import { router } from "expo-router";
import { Screen, Label, Card, Button } from "../../src/ui/components";
export default function Onboarding() {
  return (
    <Screen>
      <Label muted>1 / 3</Label>
      <Label large>Bienvenue dans MémoCycle</Label>
      <Label>
        Tu ajoutes ce que tu apprends. MémoCycle s’occupe du moment où tu dois
        le revoir.
      </Label>
      <Card>
        <Label>Aujourd’hui → J+1 → J+3 → J+7</Label>
        <Label muted>
          Chaque délai commence quand tu termines ta révision.
        </Label>
      </Card>
      <Button
        title="Continuer"
        onPress={() => router.push("/(onboarding)/study-time")}
      />
    </Screen>
  );
}
