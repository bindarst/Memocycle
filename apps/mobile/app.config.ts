import type { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "MémoCycle",
  slug: "memocycle",
  owner: "bindarst",
  version: "1.0.5",
  scheme: "memocycle",
  extra: { eas: { projectId: "3390691f-af2b-4a28-b94d-c99a9910385d" } },
  icon: "./assets/icon.png",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "app.memocycle.mobile",
    supportsTablet: true,
    usesAppleSignIn: true,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: "app.memocycle.mobile",
    versionCode: 6,
    allowBackup: false,
    blockedPermissions: ["android.permission.SYSTEM_ALERT_WINDOW"],
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#365CF5",
    },
  },
  plugins: [
    "expo-router",
    "./plugins/with-release-signing",
    "./plugins/with-short-cmake-builds",
    "expo-secure-store",
    "expo-sqlite",
    "expo-notifications",
    "expo-apple-authentication",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#F7F8FA",
        image: "./assets/splash.png",
        imageWidth: 144,
        resizeMode: "contain",
      },
    ],
    [
      "react-native-nitro-google-signin",
      {
        iosUrlScheme:
          process.env.GOOGLE_IOS_URL_SCHEME ||
          "com.googleusercontent.apps.575543516415-qjfv5cn3hfsjg241n63edgtp1rhjqmar",
      },
    ],
  ],
};
export default config;
