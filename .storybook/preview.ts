import type { Preview } from "@storybook/nextjs-vite";
import { sb } from "storybook/test";

sb.mock(import("../trpc/server.ts"));
sb.mock(import("next-auth"));
sb.mock(import("next-auth/react"));

const preview: Preview = {
  parameters: {
    nextjs: {
      appDirectory: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
};

export default preview;
