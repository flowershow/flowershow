import type { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
  displayName: "remark-wiki-link",
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.[tj]s?$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "js"],
  transformIgnorePatterns: [
    "/node_modules/(?!micromark-util-symbol|micromark|micromark-util-types)/",
  ],
};

export default jestConfig;
