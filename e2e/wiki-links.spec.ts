import { test, expect, Page } from "@playwright/test";

import "dotenv/config";

const linkBaseUrl = `/${process.env.E2E_TEST_SITE}`;

test.describe.configure({ mode: "parallel" });

test.describe("Markdown links resolution", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(`${process.env.E2E_TEST_SITE!}/blog`);
  });
  test.afterAll(async () => {
    await page.close();
  });

  test("Obsidian wiki-links", async () => {
    const obsidianWikiLinks = page
      .getByTestId("obsidian-wiki-links")
      .getByRole("link");

    const shortestPathLink = obsidianWikiLinks.nth(0);
    await expect(shortestPathLink).toHaveText("post-1");
    await expect(shortestPathLink).toHaveAttribute(
      "href",
      `${linkBaseUrl}/blog/post-1`,
    );

    const relativePathLink = obsidianWikiLinks.nth(1);
    await expect(relativePathLink).toHaveText("./post-1");
    await expect(relativePathLink).toHaveAttribute(
      "href",
      `${linkBaseUrl}/blog/post-1`,
    );

    const absolutePathLink = obsidianWikiLinks.nth(2);
    await expect(absolutePathLink).toHaveText("/blog/post-1");
    await expect(absolutePathLink).toHaveAttribute(
      "href",
      `${linkBaseUrl}/blog/post-1`,
    );

    const absolutePathLinkToRootReadme = obsidianWikiLinks.nth(3);
    await expect(absolutePathLinkToRootReadme).toHaveText("/README");
    await expect(absolutePathLinkToRootReadme).toHaveAttribute(
      "href",
      `${linkBaseUrl}`,
    );

    const backwardPathLinkToRootReadme = obsidianWikiLinks.nth(4);
    await expect(backwardPathLinkToRootReadme).toHaveText("../README");
    await expect(backwardPathLinkToRootReadme).toHaveAttribute(
      "href",
      `${linkBaseUrl}`,
    );

    const linkWithExtension = obsidianWikiLinks.nth(5);
    await expect(linkWithExtension).toHaveText("/blog/post-1.md");
  });

  // test("Obsidian embeds", async () => {
  //     const obsidianEmbeds = page.getByTestId("obsidian-embeds").getByRole("img");

  //     const shortestPathEmbed = obsidianEmbeds.nth(0);
  //     await expect(shortestPathEmbed).toHaveAttribute(
  //         "src",
  //         `${linkBaseUrl}/blog/post-1`,
  //     );

  // });

  test("CommonMark links", async () => {
    const commonMarkLinks = page
      .getByTestId("common-mark-links")
      .getByRole("link");

    const simpleRelativeLink = commonMarkLinks.nth(0);
    await expect(simpleRelativeLink).toHaveText("post-1");
    await expect(simpleRelativeLink).toHaveAttribute(
      "href",
      `${linkBaseUrl}/blog/post-1`,
    );

    const relativeLinkWithDotSlash = commonMarkLinks.nth(1);
    await expect(relativeLinkWithDotSlash).toHaveText("./post-1");
    await expect(relativeLinkWithDotSlash).toHaveAttribute(
      "href",
      `${linkBaseUrl}/blog/post-1`,
    );

    const absoluteLink = commonMarkLinks.nth(2);
    await expect(absoluteLink).toHaveText("/blog/post-1");
    await expect(absoluteLink).toHaveAttribute(
      "href",
      `${linkBaseUrl}/blog/post-1`,
    );

    const absoluteLinkToRootReadme = commonMarkLinks.nth(3);
    await expect(absoluteLinkToRootReadme).toHaveText("/README");
    await expect(absoluteLinkToRootReadme).toHaveAttribute(
      "href",
      `${linkBaseUrl}`,
    );

    const backwardLinkToRootReadme = commonMarkLinks.nth(4);
    await expect(backwardLinkToRootReadme).toHaveText("../README");
    await expect(backwardLinkToRootReadme).toHaveAttribute(
      "href",
      `${linkBaseUrl}`,
    );
  });
});
