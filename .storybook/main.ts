import type { StorybookConfig } from "@storybook/nextjs-vite";
import path from "node:path";

const config: StorybookConfig = {
  stories: [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
  ],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  staticDirs: ["../public"],
  features: {
    experimentalRSC: true,
  },
  async viteFinal(cfg) {
    cfg.resolve = cfg.resolve || {};
    const aliases = cfg.resolve.alias || {};
    cfg.resolve.alias = {
      ...aliases,
      "@/trpc": path.resolve(__dirname, "../trpc"),
      // "next-auth": require.resolve("./__mocks__/next-auth.ts"),
      // "next-auth/react": require.resolve("./__mocks__/next-auth/react.tsx"),
      // "openid-client": require.resolve("./__mocks__/empty.ts"),
      // "oidc-token-hash": require.resolve("./__mocks__/empty.ts"),
      // "@/trpc/server": require.resolve("./trpc/__mocks__/server.ts"),
    };
    // (optional) stop prebundling these
    // cfg.optimizeDeps = cfg.optimizeDeps || {};
    // cfg.optimizeDeps.exclude = [
    //   ...(cfg.optimizeDeps.exclude ?? []),
    //   "next-auth",
    //   "openid-client",
    //   "oidc-token-hash",
    // ];
    return cfg;
  },
};
export default config;
