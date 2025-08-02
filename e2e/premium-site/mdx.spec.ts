import { test, expect } from "../_fixtures/published-site-test";

test.describe("Links and embeds", () => {
  test("Obsidian wiki-links", async ({ publishedSitePage }) => {
    await publishedSitePage.goto("/syntax/syntax");

    const wikiLink = publishedSitePage.page
      .getByTestId("obsidian-wiki-link")
      .locator("a");
    await expect(wikiLink).toHaveText("post-1");
    await expect(wikiLink).toHaveAttribute(
      "href",
      `${publishedSitePage.siteUrlPath}/blog/post-1`,
    );
  });
});

test("Obsidian embeds", async ({ publishedSitePage }) => {
  await publishedSitePage.goto("/syntax/syntax");

  const obsidianEmbed = publishedSitePage.page
    .getByTestId("obsidian-embed")
    .getByRole("img");
  await expect(obsidianEmbed).toHaveAttribute(
    "src",
    `${publishedSitePage.siteUrlPath}/_r/-/assets/image.jpg`,
  );
});
