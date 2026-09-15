/* eslint-disable @typescript-eslint/no-require-imports */
const { withAppBuildGradle } = require("@expo/config-plugins");
const os = require("node:os");
const path = require("node:path");

const marker = "// memocycle: short CMake staging path for Windows";

module.exports = function withShortCmakeBuilds(config) {
  return withAppBuildGradle(config, (result) => {
    if (result.modResults.language !== "groovy")
      throw new Error("MémoCycle requires a Groovy Android build file");
    if (result.modResults.contents.includes(marker)) return result;
    const anchor = "    packagingOptions {";
    if (!result.modResults.contents.includes(anchor))
      throw new Error("Unable to configure the Android CMake staging path");
    const stagingDirectory =
      process.platform === "win32"
        ? path.join(os.homedir(), ".mc-cxx").replaceAll("\\", "/")
        : "../../../../.cxx/app";
    const block = `${marker}
    externalNativeBuild {
        cmake {
            buildStagingDirectory "${stagingDirectory}"
        }
    }

`;
    result.modResults.contents = result.modResults.contents.replace(
      anchor,
      `${block}${anchor}`,
    );
    return result;
  });
};
