import "@testing-library/jest-dom";
import { buildSiteMapFromSiteBlobs } from "./build-site-map";
import type { SiteMap } from "./build-site-map";
import type { Blob, Status } from "@prisma/client";

test("buildSiteMapFromSiteBlobs", () => {
  const blobs: Blob[] = [
    {
      id: "1",
      siteId: "1",
      path: "blog/2024/may/aaa.md",
      appPath: "blog/2024/may/aaa",
      size: 100,
      sha: "sha1",
      metadata: {
        title: "Aaa Title",
        description: "Aaa Description",
      },
      extension: ".md",
      syncStatus: "SUCCESS" as Status,
      syncError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "2",
      siteId: "1",
      path: "blog/2024/may/README.md",
      appPath: "blog/2024/may",
      size: 100,
      sha: "sha2",
      metadata: {
        title: "May README Title",
        description: "May Description",
      },
      extension: ".md",
      syncStatus: "SUCCESS" as Status,
      syncError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "3",
      siteId: "1",
      path: "blog/2024/december/ccc.md",
      appPath: "blog/2024/december/ccc",
      size: 100,
      sha: "sha3",
      metadata: {
        title: "Ccc Title",
        description: "Ccc Description",
      },
      extension: ".md",
      syncStatus: "SUCCESS" as Status,
      syncError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "4",
      siteId: "1",
      path: "notes/eee.md",
      appPath: "notes/eee",
      size: 100,
      sha: "sha4",
      metadata: {
        title: "Eee Title",
        description: "Eee Description",
      },
      extension: ".md",
      syncStatus: "SUCCESS" as Status,
      syncError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "5",
      siteId: "1",
      path: "notes/ddd.md",
      appPath: "notes/ddd",
      size: 100,
      sha: "sha5",
      metadata: {
        title: "Ddd Title",
        description: "Ddd Description",
      },
      extension: ".md",
      syncStatus: "SUCCESS" as Status,
      syncError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "6",
      siteId: "1",
      path: "README.md",
      appPath: "",
      size: 100,
      sha: "sha6",
      metadata: {
        title: "README Title",
        description: "Readme Description",
      },
      extension: ".md",
      syncStatus: "SUCCESS" as Status,
      syncError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const expectedSiteMap: SiteMap = [
    {
      id: "blog",
      label: "blog",
      path: "/@username/abc/blog",
      children: [
        {
          id: "blog/2024",
          label: "2024",
          path: "/@username/abc/blog/2024",
          children: [
            {
              id: "blog/2024/december",
              label: "december",
              path: "/@username/abc/blog/2024/december",
              children: [
                {
                  id: "blog/2024/december/ccc.md",
                  label: "Ccc Title",
                  path: "/@username/abc/blog/2024/december/ccc",
                },
              ],
            },
            {
              id: "blog/2024/may",
              label: "may",
              path: "/@username/abc/blog/2024/may",
              children: [
                {
                  id: "blog/2024/may/aaa.md",
                  label: "Aaa Title",
                  path: "/@username/abc/blog/2024/may/aaa",
                },
                {
                  id: "blog/2024/may/README.md",
                  label: "May README Title",
                  path: "/@username/abc/blog/2024/may",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "notes",
      label: "notes",
      path: "/@username/abc/notes",
      children: [
        {
          id: "notes/ddd.md",
          label: "Ddd Title",
          path: "/@username/abc/notes/ddd",
        },
        {
          id: "notes/eee.md",
          label: "Eee Title",
          path: "/@username/abc/notes/eee",
        },
      ],
    },
    {
      id: "README.md",
      label: "README Title",
      path: "/@username/abc",
    },
  ];

  const siteMap = buildSiteMapFromSiteBlobs(blobs, "/@username/abc");
  expect(siteMap).toMatchObject(expectedSiteMap);
});
