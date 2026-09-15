import React from "react";
import { Image, Platform, View, Linking } from "react-native";
import { GoogleSignInButton } from "react-native-nitro-google-signin";
import * as Apple from "expo-apple-authentication";
import { useAuth } from "../../src/auth/AuthProvider";
import { signInWithGoogle } from "../../src/auth/googleAuthService";
import { signInWithApple } from "../../src/auth/appleAuthService";
import {
  Screen,
  Label,
  Button,
  ErrorText,
  useAction,
} from "../../src/ui/components";
// React Native resolves static raster assets through its numeric module registry.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logo = require("../../assets/icon.png") as number;
export default function Welcome() {
  const { signIn, error: authError } = useAuth();
  const a = useAction();
  const legal = process.env.EXPO_PUBLIC_LEGAL_URL ?? "https://memocycle.app";
  return (
    <Screen>
      <View
        style={{
          maxWidth: 480,
          width: "100%",
          alignSelf: "center",
          paddingTop: 64,
          gap: 24,
        }}
      >
        <Image
          source={logo}
          accessibilityLabel="Logo MémoCycle"
          style={{ width: 88, height: 88, borderRadius: 22, alignSelf: "center" }}
        />
        <Label large>MémoCycle</Label>
        <Label large>Révise au bon moment.</Label>
        <Label muted>
          MémoCycle organise automatiquement tes prochaines révisions.
        </Label>
        <View style={{ height: 24 }} />
        <GoogleSignInButton
          size="wide"
          colorScheme="light"
          signInBehavior="none"
          accessibilityLabel="Continuer avec Google"
          disabled={a.busy}
          onPress={() =>
            a.run(async () => {
              const r = await signInWithGoogle();
              if (r.status === "success")
                await signIn("google", { idToken: r.idToken });
            })
          }
        />
        {Platform.OS === "ios" && (
          <Apple.AppleAuthenticationButton
            buttonType={Apple.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={Apple.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={{ height: 48, width: "100%" }}
            onPress={() => {
              if (!a.busy)
                void a.run(async () => {
                  const r = await signInWithApple();
                  if (r) await signIn("apple", r);
                });
            }}
          />
        )}
        <ErrorText message={a.error || authError} />
        <Button
          secondary
          title="Conditions d’utilisation"
          onPress={() => void Linking.openURL(`${legal}/terms`)}
        />
        <Button
          secondary
          title="Politique de confidentialité"
          onPress={() => void Linking.openURL(`${legal}/privacy`)}
        />
      </View>
    </Screen>
  );
}
