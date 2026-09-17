/* eslint-disable @typescript-eslint/no-require-imports */
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// Hugeicons exposes thousands of modules; limit parallel file handles on Windows.
config.maxWorkers = 2;

module.exports = config;
