import * as Apple from "expo-apple-authentication";
import {
  randomUUID,
  digestStringAsync,
  CryptoDigestAlgorithm,
} from "expo-crypto";
export async function signInWithApple() {
  const raw = randomUUID() + randomUUID();
  const nonce = await digestStringAsync(CryptoDigestAlgorithm.SHA256, raw);
  try {
    const result = await Apple.signInAsync({
      requestedScopes: [
        Apple.AppleAuthenticationScope.EMAIL,
        Apple.AppleAuthenticationScope.FULL_NAME,
      ],
      nonce,
    });
    if (!result.identityToken) throw new Error("Identité Apple indisponible");
    return {
      idToken: result.identityToken,
      nonce,
      displayName:
        [result.fullName?.givenName, result.fullName?.familyName]
          .filter(Boolean)
          .join(" ") || undefined,
    };
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      e.code === "ERR_REQUEST_CANCELED"
    )
      return null;
    throw new Error("Connexion Apple impossible. Réessaie.");
  }
}
