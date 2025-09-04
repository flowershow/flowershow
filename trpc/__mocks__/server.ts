import { fn } from "storybook/test";

// Minimal shape used by your List stories/tests
export const api = {
  site: {
    getCatalogFiles: {
      query: fn(async (_args?: any) => ({ items: [] })).mockName(
        "api.site.getCatalogFiles.query",
      ),
    },
  },
};
