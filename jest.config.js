const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testMatch: ["**/*.test.[jt]s?(x)"],
  testEnvironment: "jest-environment-jsdom",
  preset: "ts-jest",
};

// workaround to override next/jest defaults
// see: https://github.com/vercel/next.js/issues/35634#issuecomment-1115250297
async function jestConfig() {
  const nextJestConfig = await createJestConfig(customJestConfig)();
  // transforms disabled to support ESM
  // see: https://jestjs.io/docs/ecmascript-modules
  nextJestConfig.transform = {};
  nextJestConfig.extensionsToTreatAsEsm = [".jsx"];
  return nextJestConfig;
}

module.exports = jestConfig;
