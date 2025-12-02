import type { PageMetadata } from "@/server/api/types";

export const oneItem = (over: Partial<PageMetadata> = {}) => ({
  url: "/post-1",
  metadata: {
    title: "Hello Flowershow",
    description: "Short summary goes here.",
    authors: ["Jane Stone", "John Doe"],
    date: "2025-08-01T12:00:00.000Z",
    image: "https://r2-assets.flowershow.app/placeholder.png",
    tags: ["tagA, tagB"],
    ...over,
  } as PageMetadata,
});

export const manyItems = (n = 23) =>
  Array.from({ length: n }, (_, i) =>
    oneItem({
      title: `Post #${i + 1}`,
      date: `2025-07-${String((i % 28) + 1).padStart(2, "0")}`,
      image:
        i % 3 === 0 ? undefined : `https://picsum.photos/seed/${i}/640/360`,
    }),
  );
