import {
  GoogleOneTapSignIn,
  isSuccessResponse,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from "react-native-nitro-google-signin";
import { Platform } from "react-native";
export type GoogleSignInResult =
  { status: "cancelled" } | { status: "success"; idToken: string };
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  if (
    !webClientId ||
    (Platform.OS === "ios" && !iosClientId) ||
    (Platform.OS === "android" && !androidClientId)
  )
    throw new Error(
      "La connexion Google doit être configurée pour cette version de MémoCycle.",
    );
  try {
    GoogleOneTapSignIn.configure({
      webClientId,
      iosClientId,
    });
    let result = await GoogleOneTapSignIn.signIn();
    if (result.type === "noSavedCredentialFound")
      result = await GoogleOneTapSignIn.createAccount();
    if (isCancelledResponse(result)) return { status: "cancelled" };
    if (!isSuccessResponse(result) || !result.data.idToken)
      throw new Error("Aucun compte Google disponible.");
    return { status: "success", idToken: result.data.idToken };
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED)
      return { status: "cancelled" };
    if (isErrorWithCode(e) && e.code === statusCodes.DEVELOPER_ERROR)
      throw new Error(
        "La configuration Google de cette version est incorrecte.",
      );
    throw new Error(
      "Connexion Google impossible. Vérifie ton réseau et réessaie.",
    );
  }
}
