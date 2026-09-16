import React from "react";
import { Image, Platform, StyleSheet, Text, View, Linking } from "react-native";
import { BrainCircuit, ShieldCheck, Sparkles } from "lucide-react-native";
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
          maxWidth: 480,
          width: "100%",
          alignSelf: "center",
          paddingTop: 38,
          gap: 20,
        }}
      >
        <View style={[styles.hero, { backgroundColor: c.primary }]}>
          <View style={[styles.orb, { backgroundColor: c.accent }]} />
          <Image
            source={logo}
            accessibilityLabel="Logo MémoCycle"
            style={styles.logo}
          />
          <View style={styles.brandRow}>
            <Sparkles color={c.accent} size={17} />
            <Text style={[styles.kicker, { color: c.onPrimary }]}>APPRENDRE, PUIS RETENIR</Text>
          </View>
          <Text style={[styles.heroTitle, { color: c.onPrimary }]}>Ta mémoire, au bon rythme.</Text>
          <Text style={[styles.heroCopy, { color: c.onPrimary }]}>MémoCycle transforme tes cours en habitudes simples et te rappelle juste avant l’oubli.</Text>
        </View>
        <View style={styles.promiseRow}>
          <View style={[styles.promiseIcon, { backgroundColor: c.primarySoft }]}><BrainCircuit color={c.primary} size={21} /></View>
          <View style={{ flex: 1 }}><Label style={{ fontWeight: "800" }}>Un planning qui s’adapte</Label><Label muted style={{ fontSize: 13 }}>Tes révisions restent accessibles hors ligne.</Label></View>
        </View>
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
        <View style={styles.secureRow}><ShieldCheck color={c.success} size={17} /><Label muted style={{ fontSize: 12 }}>Connexion sécurisée · aucune donnée Google vendue</Label></View>
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

const styles = StyleSheet.create({
  hero: { minHeight: 330, borderRadius: 32, padding: 24, gap: 14, overflow: "hidden", justifyContent: "flex-end" },
  orb: { position: "absolute", width: 210, height: 210, borderRadius: 105, right: -65, top: -72, opacity: 0.2 },
  logo: { width: 76, height: 76, borderRadius: 22, marginBottom: 20 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  kicker: { fontSize: 11, fontWeight: "900", letterSpacing: 1.3, opacity: 0.82 },
  heroTitle: { fontSize: 36, lineHeight: 40, fontWeight: "900", letterSpacing: -1.3, maxWidth: 330 },
  heroCopy: { fontSize: 15, lineHeight: 22, fontWeight: "600", opacity: 0.78, maxWidth: 330 },
  promiseRow: { flexDirection: "row", gap: 12, alignItems: "center", paddingHorizontal: 4 },
  promiseIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  secureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
});
