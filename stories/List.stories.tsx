import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { mocked } from "storybook/test";
import List from "@/components/public/list";
import { api } from "@/trpc/server";
import { manyItems } from "@/stories/__fixtures__/catalog";
import "@/styles/global.css";

const meta: Meta<typeof List> = {
  title: "MDX/List",
  component: List,
  args: {
    siteId: "site_123",
    dir: "",
    pageSize: 10,
  },
};
export default meta;

type Story = StoryObj<typeof List>;

export const Default: Story = {
  async beforeEach() {
    mocked(api.site.getCatalogFiles.query).mockResolvedValue({
      items: manyItems(3),
    });
  },
};

export const WithOldFieldsProp: Story = {
  args: {
    fields: ["title", "description", "date", "authors", "image"],
  },
  async beforeEach() {
    mocked(api.site.getCatalogFiles.query).mockResolvedValue({
      items: manyItems(3),
    });
  },
};

// export const WithPagination: Story = {
//   parameters: {
//     nextjs: {
//       router: {
//         pathname: "/blog",
//         query: {
//           page: 1,
//         },
//       },
//     },
//   },
//   args: { pageNumber: 2, pageSize: 10 },
//   async beforeEach() {
//     mocked(api.site.getCatalogFiles.query).mockResolvedValue({
//       items: manyItems(23),
//     });
//   },
// };

export const CustomSlots: Story = {
  args: {
    slots: {
      media: "image",
      eyebrow: "title",
      headline: "date",
      summary: "description",
      footnote: "tags",
    },
  },
  async beforeEach() {
    mocked(api.site.getCatalogFiles.query).mockResolvedValue({
      items: manyItems(3),
    });
  },
};

// export const WithFormats: Story = {
//   args: {
//     locale: "pl-PL",
//     slots: {
//       eyebrow: "date",
//       headline: "title",
//       summary: "description",
//       footnote: "authors",
//     },
//     slotsFormat: {
//       date: "date:yyyy-mm-dd",
//       authors: "join: • ",
//     },
//   } as any,
//   async beforeEach() {
//     mocked(api.site.getCatalogFiles.query).mockResolvedValue({
//       items: [oneItem({ authors: ["Ala", "Ola", "Ela"] })],
//     });
//   },
// };

export const EmptyState: Story = {
  async beforeEach() {
    mocked(api.site.getCatalogFiles.query).mockResolvedValue({ items: [] });
  },
};
