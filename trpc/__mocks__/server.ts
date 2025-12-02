import { fn } from "storybook/test";

// Minimal shape used by your List stories/tests
export const api = {
  site: {
    getListComponentItems: {
      query: fn(async (_args?: any) => ({ items: [] })).mockName(
        "api.site.getListComponentItems.query",
      ),
    },
  },
};
