/* eslint-disable @typescript-eslint/no-require-imports */
const { withAppBuildGradle } = require("@expo/config-plugins");

const definitionsMarker = "// memocycle: release signing properties";
const signingMarker = "// memocycle: production signing config";

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (result) => {
    if (result.modResults.language !== "groovy")
      throw new Error("MémoCycle requires a Groovy Android build file");

    let contents = result.modResults.contents;
    if (!contents.includes(definitionsMarker)) {
      const androidAnchor = "android {";
      if (!contents.includes(androidAnchor))
        throw new Error("Unable to locate the Android Gradle configuration");
      const definitions = `${definitionsMarker}
def memocycleKeystorePropertiesFile = rootProject.file('../../../credentials/android/keystore.properties')
def memocycleKeystoreProperties = new Properties()
if (memocycleKeystorePropertiesFile.exists()) {
    memocycleKeystoreProperties.load(new FileInputStream(memocycleKeystorePropertiesFile))
}

`;
      contents = contents.replace(androidAnchor, `${definitions}${androidAnchor}`);
    }

    if (!contents.includes(signingMarker)) {
      const debugConfig = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }`;
      if (!contents.includes(debugConfig))
        throw new Error("Unable to locate the Android debug signing config");
      const releaseConfig = `${debugConfig}
        ${signingMarker}
        release {
            if (!memocycleKeystorePropertiesFile.exists()) {
                throw new GradleException('Missing credentials/android/keystore.properties')
            }
            storeFile rootProject.file('../../../credentials/android/memocycle-release.jks')
            storePassword memocycleKeystoreProperties['storePassword']
            keyAlias memocycleKeystoreProperties['keyAlias']
            keyPassword memocycleKeystoreProperties['keyPassword']
        }`;
      contents = contents.replace(debugConfig, releaseConfig);
    }

    const buildTypesStart = contents.indexOf("    buildTypes {");
    const releaseStart = contents.indexOf("        release {", buildTypesStart);
    const releaseEnd = contents.indexOf("        }", releaseStart);
    if (releaseStart === -1 || releaseEnd === -1)
      throw new Error("Unable to locate the Android release build type");
    const releaseBlock = contents.slice(releaseStart, releaseEnd + 9);
    const signedReleaseBlock = releaseBlock.replace(
      "signingConfig signingConfigs.debug",
      "signingConfig signingConfigs.release",
    );
    if (!signedReleaseBlock.includes("signingConfig signingConfigs.release"))
      throw new Error("Unable to configure Android production signing");
    contents =
      contents.slice(0, releaseStart) +
      signedReleaseBlock +
      contents.slice(releaseEnd + 9);

    result.modResults.contents = contents;
    return result;
  });
};
