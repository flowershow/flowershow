import "@testing-library/jest-dom";
import {
  buildNestedTree,
  buildNestedTreeFromFilesMap,
} from "./build-nested-tree";
import type { NestedRepoTree } from "./build-nested-tree";
import { GitHubAPIRepoTree } from "./github";
import { PageMetadata } from "@/server/api/types";

test("buildNestedTree", () => {
  const flatTree: GitHubAPIRepoTree = {
    sha: "tree-sha",
    url: "https://api.github.com/repos/username/repo/git/trees/1",
    tree: [
      // note tree type items are not necessarily placed right before their children
      // here they are placed like this so that its easier to see the tree structure
      {
        path: "blog",
        sha: "blog-sha",
        url: "https://api.github.com/repos/username/repo/git/blobs/blog-sha",
        type: "tree",
        mode: "040000",
      },
      {
        path: "blog/2024",
        sha: "blog/2024-sha",
        url: "https://api.github.com/repos/username/repo/git/blobs/blog/2024-sha",
        type: "tree",
        mode: "040000",
      },
      {
        path: "blog/2024/may",
        sha: "blog/2024/may-sha",
        url: "https://api.github.com/repos/username/repo/git/blobs/blog/2024/may-sha",
        type: "tree",
        mode: "040000",
      },
      {
        path: "blog/2024/may/aaa.md",
        sha: "blog/2024/may/aaa-sha",
        url: "https://api.github.com/repos/username/repo/git/blobs/blog/2024/may/aaa-sha",
        size: 100,
        type: "blob",
        mode: "100644",
      },
      {
        path: "blog/2024/may/+ and spaces.md",
        sha: "blog/2024/may/+ and spaces-sha",
        url: "https://api.github.com/repos/username/repo/git/blobs/blog/2024/may/+ and spaces-sha",
        size: 100,
        type: "blob",
        mode: "100644",
      },
      {
        path: "blog/2024/may/README.md",
        sha: "blog/2024/may/README-sha",
        url: "https://api.github.com/repos/username/repo/git/blobs/blog/2024/may/README-sha",
        size: 100,
        type: "blob",
        mode: "100644",
      },
      {
        path: "blog/2024/december",
        sha: "blog/2024/december-sha",
        url: "https://api.github.com/repos/username/repo/git/blobs/blog/2024/december-sha",
        type: "tree",
        mode: "040000",
      },
      {
        path: "blog/2024/december/ccc.md",
        sha: "blog/2024/december/ccc-sha",
        url: "https://api.github.com/repos/username/repo/git/blobs/blog/2024/december/ccc-sha",
        size: 100,
        type: "blob",
        mode: "100644",
      },
      {
        path: "notes",
        sha: "notes-sha",
        url: "https://api.github.com/repos/username/repo/git/blobs/notes-sha",
        type: "tree",
        mode: "040000",
      },
      {
        path: "notes/eee.md",
        sha: "notes/eee-sha",
        url: "https://api.github.com/repos/username/repo/git/blobs/notes/eee-sha",
        size: 100,
        type: "blob",
        mode: "100644",
      },
      {
        path: "notes/ddd.md",
        sha: "notes/ddd-sha",
        url: "https://api.github.com/repos/username/repo/git/blobs/notes/ddd-sha",
        size: 100,
        type: "blob",
        mode: "100644",
      },
      {
        path: "README.md",
        sha: "README-sha",
        url: "https://api.github.com/repos/username/repo/git/blobs/README-sha",
        size: 100,
        type: "blob",
        mode: "100644",
      },
      {
        path: ".gitignore",
        sha: "gitignore-sha",
        url: "https://api.github.com/repos/username/repo/git/blobs/gitignore-sha",
        size: 100,
        type: "blob",
        mode: "100644",
      },
    ],
  };

  const expectedNestedTree: NestedRepoTree = [
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
                  label: "ccc",
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
                  id: "blog/2024/may/+ and spaces.md",
                  label: "+ and spaces",
                  path: "/@username/abc/blog/2024/may/%2B+and+spaces",
                },
                {
                  id: "blog/2024/may/aaa.md",
                  label: "aaa",
                  path: "/@username/abc/blog/2024/may/aaa",
                },
                {
                  id: "blog/2024/may/README.md",
                  label: "README",
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
        { id: "notes/ddd.md", label: "ddd", path: "/@username/abc/notes/ddd" },
        { id: "notes/eee.md", label: "eee", path: "/@username/abc/notes/eee" },
      ],
    },
    { id: "README.md", label: "README", path: "/@username/abc" },
  ];

  // ignore files that are not markdown
  const nestedTree = buildNestedTree(flatTree, "/@username/abc");
  // expect(nestedTree.length).toBe(expectedNestedTree.length);
  // expect(nestedTree[0]).toMatchObject(expectedNestedTree[0]!);
  // expect(nestedTree[1]).toMatchObject(expectedNestedTree[1]!);
  // expect(nestedTree[2]).toMatchObject(expectedNestedTree[2]!);
  expect(nestedTree).toMatchObject(expectedNestedTree);
});

test("buildNestedTreeFromFilesMap", () => {
  const flatTree: PageMetadata[] = [
    {
      _path: "blog/2024/may/+ and spaces.md",
      _url: "blog/2024/may/%2B%20and%20spaces",
      _pagetype: "story",
      title: "+ And Spaces Title",
      description: "+ And Spaces Description",
    },
    {
      _path: "blog/2024/may/aaa.md",
      _url: "blog/2024/may/aaa",
      _pagetype: "story",
      title: "Aaa Title",
      description: "Aaa Description",
    },
    {
      _path: "blog/2024/may/README.md",
      _url: "blog/2024/may",
      _pagetype: "story",
      title: "May README Title",
      description: "May Description",
    },
    {
      _path: "blog/2024/december/ccc.md",
      _url: "blog/2024/december/ccc",
      _pagetype: "story",
      title: "Ccc Title",
      description: "Ccc Description",
    },
    {
      _path: "notes/eee.md",
      _url: "notes/eee",
      _pagetype: "story",
      title: "Eee Title",
      description: "Eee Description",
    },
    {
      _path: "notes/ddd.md",
      _url: "notes/ddd",
      _pagetype: "story",
      title: "Ddd Title",
      description: "Ddd Description",
    },
    {
      _path: "README.md",
      _url: "/",
      _pagetype: "story",
      title: "README Title",
      description: "Readme Description",
    },
  ];

  const expectedNestedTree: NestedRepoTree = [
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
                  id: "blog/2024/may/+ and spaces.md",
                  label: "+ And Spaces Title",
                  path: "/@username/abc/blog/2024/may/%2B+and+spaces",
                },
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

  // ignore files that are not markdown
  const nestedTree = buildNestedTreeFromFilesMap(flatTree, "/@username/abc");
  // expect(nestedTree.length).toBe(expectedNestedTree.length);
  // expect(nestedTree[0]).toMatchObject(expectedNestedTree[0]!);
  // expect(nestedTree[1]).toMatchObject(expectedNestedTree[1]!);
  // expect(nestedTree[2]).toMatchObject(expectedNestedTree[2]!);
  expect(nestedTree).toMatchObject(expectedNestedTree);
});
