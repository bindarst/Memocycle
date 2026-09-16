import React from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  Linking,
  Pressable,
} from "react-native";
import { GoogleSignInButton } from "react-native-nitro-google-signin";
import * as Apple from "expo-apple-authentication";
import { useAuth } from "../../src/auth/AuthProvider";
import { signInWithGoogle } from "../../src/auth/googleAuthService";
import { signInWithApple } from "../../src/auth/appleAuthService";
import {
  Screen,
  ErrorText,
  useAction,
  usePalette,
} from "../../src/ui/components";

// React Native resolves static raster assets through its numeric module registry.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logo = require("../../assets/icon.png") as number;

export default function Welcome() {
  const { signIn, error: authError } = useAuth();
  const c = usePalette();
  const a = useAction();
  const legal = process.env.EXPO_PUBLIC_LEGAL_URL ?? "https://memocycle.app";

  return (
    <Screen>
      <View
        style={{
          maxWidth: 380,
          width: "100%",
          alignSelf: "center",
          paddingTop: 64,
          paddingHorizontal: 8,
          gap: 32,
        }}
      >
        <View style={{ alignItems: "center", gap: 12 }}>
          <Image
            source={logo}
            accessibilityLabel="Logo MémoCycle"
            style={styles.logo}
          />
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={[styles.title, { color: c.textPrimary }]}>
              MémoCycle
            </Text>
            <Text style={{ fontSize: 14, color: c.textSecondary }}>
              Révise au bon moment.
            </Text>
          </View>
        </View>

        <View style={{ gap: 12 }}>
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
              cornerRadius={10}
              style={{ height: 44, width: "100%" }}
              onPress={() => {
                if (!a.busy)
                  void a.run(async () => {
                    const r = await signInWithApple();
                    if (r) await signIn("apple", r);
                  });
              }}
            />
          )}
        </View>

        <ErrorText message={a.error || authError} />

        <View style={styles.legalRow}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Confidentialité"
            onPress={() => void Linking.openURL(`${legal}/privacy`)}
          >
            <Text style={[styles.legalLink, { color: c.textSecondary }]}>
              Confidentialité
            </Text>
          </Pressable>
          <Text style={{ color: c.textSecondary, fontSize: 12 }}>·</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Conditions"
            onPress={() => void Linking.openURL(`${legal}/terms`)}
          >
            <Text style={[styles.legalLink, { color: c.textSecondary }]}>
              Conditions
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { width: 56, height: 56, borderRadius: 14 },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: "500",
  },
});

