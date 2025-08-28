import "@testing-library/jest-dom";
import { buildSiteTree } from "./build-site-tree";
import type { SiteTree } from "./build-site-tree";

const blobs: any[] = [
  {
    path: "README.md",
    appPath: "/",
    metadata: {
      title: "Top README",
    },
  },
  {
    path: "notes/abc.md",
    appPath: "notes/abc",
    metadata: {
      title: "ABC Note",
    },
  },
  {
    path: "notes/xyz.md",
    appPath: "notes/xyz",
    metadata: {
      title: "XYZ Note",
    },
  },
  {
    path: "notes/README.md",
    appPath: "notes",
    metadata: {
      title: "README Note",
    },
  },
  {
    path: "guide/README.md",
    appPath: "guide",
    metadata: {
      title: "Guide README",
    },
  },
  {
    path: "guide/quickstart/README.md",
    appPath: "guide/quickstart",
    metadata: {
      title: "Quickstart README",
    },
  },
  {
    path: "guide/quickstart/01-start-here.md",
    appPath: "guide/quickstart/01-start-here",
    metadata: {
      title: "BBB Start Here",
    },
  },
  {
    path: "guide/quickstart/02-next-go-here.md",
    appPath: "guide/quickstart/02-next-go-here",
    metadata: {
      title: "AAA Next Go Here",
    },
  },
  {
    path: "guide/quickstart/03-and-then-here.md",
    appPath: "guide/quickstart/03-and-then-here",
    metadata: {
      title: "CCC End Here",
    },
  },
];

describe("Site Tree", () => {
  test("Site tree with files ordered by file name", () => {
    const expectedSiteTree: SiteTree = {
      kind: "root",
      label: "root",
      path: null,
      children: [
        {
          kind: "dir",
          label: "Guide",
          name: "guide",
          path: "guide",
          urlPath: "/guide",
          children: [
            {
              kind: "dir",
              label: "Quickstart",
              name: "quickstart",
              path: "guide/quickstart",
              urlPath: "/guide/quickstart",
              children: [
                {
                  kind: "file",
                  label: "BBB Start Here",
                  name: "01-start-here.md",
                  path: "guide/quickstart/01-start-here.md",
                  urlPath: "/guide/quickstart/01-start-here",
                  metadata: {
                    title: "BBB Start Here",
                  },
                },
                {
                  kind: "file",
                  label: "AAA Next Go Here",
                  name: "02-next-go-here.md",
                  path: "guide/quickstart/02-next-go-here.md",
                  urlPath: "/guide/quickstart/02-next-go-here",
                  metadata: {
                    title: "AAA Next Go Here",
                  },
                },
                {
                  kind: "file",
                  label: "CCC End Here",
                  name: "03-and-then-here.md",
                  path: "guide/quickstart/03-and-then-here.md",
                  urlPath: "/guide/quickstart/03-and-then-here",
                  metadata: {
                    title: "CCC End Here",
                  },
                },
                {
                  kind: "file",
                  label: "Quickstart README",
                  name: "README.md",
                  path: "guide/quickstart/README.md",
                  urlPath: "/guide/quickstart",
                  metadata: {
                    title: "Quickstart README",
                  },
                },
              ],
            },
            {
              kind: "file",
              label: "Guide README",
              name: "README.md",
              path: "guide/README.md",
              urlPath: "/guide",
              metadata: {
                title: "Guide README",
              },
            },
          ],
        },
        {
          kind: "dir",
          label: "Notes",
          path: "notes",
          urlPath: "/notes",
          name: "notes",
          children: [
            {
              kind: "file",
              label: "ABC Note",
              name: "abc.md",
              path: "notes/abc.md",
              urlPath: "/notes/abc",
              metadata: {
                title: "ABC Note",
              },
            },
            {
              kind: "file",
              label: "README Note",
              name: "README.md",
              path: "notes/README.md",
              urlPath: "/notes",
              metadata: {
                title: "README Note",
              },
            },
            {
              kind: "file",
              label: "XYZ Note",
              name: "xyz.md",
              path: "notes/xyz.md",
              urlPath: "/notes/xyz",
              metadata: {
                title: "XYZ Note",
              },
            },
          ],
        },
        {
          kind: "file",
          label: "Top README",
          name: "README.md",
          path: "README.md",
          urlPath: "/",
          metadata: {
            title: "Top README",
          },
        },
      ],
    };

    const siteMap = buildSiteTree(blobs);
    console.log({
      siteMap: JSON.stringify(siteMap, null, 2),
      expectedSiteMap: JSON.stringify(expectedSiteTree, null, 2),
    });
    expect(siteMap).toMatchObject(expectedSiteTree);
  });

  test("Site tree with files ordered by title (default)", () => {
    const expectedSiteTree: SiteTree = {
      kind: "root",
      label: "root",
      path: null,
      children: [
        {
          kind: "dir",
          label: "Guide",
          name: "guide",
          path: "guide",
          urlPath: "/guide",
          children: [
            {
              kind: "dir",
              label: "Quickstart",
              name: "quickstart",
              path: "guide/quickstart",
              urlPath: "/guide/quickstart",
              children: [
                {
                  kind: "file",
                  label: "AAA Next Go Here",
                  name: "02-next-go-here.md",
                  path: "guide/quickstart/02-next-go-here.md",
                  urlPath: "/guide/quickstart/02-next-go-here",
                  metadata: {
                    title: "AAA Next Go Here",
                  },
                },
                {
                  kind: "file",
                  label: "BBB Start Here",
                  name: "01-start-here.md",
                  path: "guide/quickstart/01-start-here.md",
                  urlPath: "/guide/quickstart/01-start-here",
                  metadata: {
                    title: "BBB Start Here",
                  },
                },
                {
                  kind: "file",
                  label: "CCC End Here",
                  name: "03-and-then-here.md",
                  path: "guide/quickstart/03-and-then-here.md",
                  urlPath: "/guide/quickstart/03-and-then-here",
                  metadata: {
                    title: "CCC End Here",
                  },
                },
                {
                  kind: "file",
                  label: "Quickstart README",
                  name: "README.md",
                  path: "guide/quickstart/README.md",
                  urlPath: "/guide/quickstart",
                  metadata: {
                    title: "Quickstart README",
                  },
                },
              ],
            },
            {
              kind: "file",
              label: "Guide README",
              name: "README.md",
              path: "guide/README.md",
              urlPath: "/guide",
              metadata: {
                title: "Guide README",
              },
            },
          ],
        },
        {
          kind: "dir",
          label: "Notes",
          path: "notes",
          urlPath: "/notes",
          name: "notes",
          children: [
            {
              kind: "file",
              label: "ABC Note",
              name: "abc.md",
              path: "notes/abc.md",
              urlPath: "/notes/abc",
              metadata: {
                title: "ABC Note",
              },
            },
            {
              kind: "file",
              label: "README Note",
              name: "README.md",
              path: "notes/README.md",
              urlPath: "/notes",
              metadata: {
                title: "README Note",
              },
            },
            {
              kind: "file",
              label: "XYZ Note",
              name: "xyz.md",
              path: "notes/xyz.md",
              urlPath: "/notes/xyz",
              metadata: {
                title: "XYZ Note",
              },
            },
          ],
        },
        {
          kind: "file",
          label: "Top README",
          name: "README.md",
          path: "README.md",
          urlPath: "/",
          metadata: {
            title: "Top README",
          },
        },
      ],
    };

    const siteMap = buildSiteTree(blobs, { orderBy: "title" });
    expect(siteMap).toMatchObject(expectedSiteTree);
  });
});
