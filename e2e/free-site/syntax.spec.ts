import { test, expect } from "../_fixtures/published-site-test";

test.describe("Links and embeds", () => {
  test("Obsidian wiki-links", async ({ publishedSitePage }) => {
    await publishedSitePage.goto("/syntax/links-and-embeds");

    const wikiLink = publishedSitePage.page
      .getByTestId("obsidian-wiki-link")
      .locator("a");
    await expect(wikiLink).toHaveText("post-1");
    await expect(wikiLink).toHaveAttribute(
      "href",
      `${publishedSitePage.siteUrlPath}/blog/post-1`,
    );

    const wikiLinkAbsolute = publishedSitePage.page
      .getByTestId("obsidian-wiki-link-absolute")
      .locator("a");
    await expect(wikiLinkAbsolute).toHaveText("blog/post-1");
    await expect(wikiLinkAbsolute).toHaveAttribute(
      "href",
      `${publishedSitePage.siteUrlPath}/blog/post-1`,
    );

    const wikiLinkRootReadme = publishedSitePage.page
      .getByTestId("obsidian-wiki-link-readme")
      .locator("a");
    await expect(wikiLinkRootReadme).toHaveText("README");
    await expect(wikiLinkRootReadme).toHaveAttribute(
      "href",
      `${publishedSitePage.siteUrlPath}`,
    );

    const wikiLinkBlogReadme = publishedSitePage.page
      .getByTestId("obsidian-wiki-link-readme-blog")
      .locator("a");
    await expect(wikiLinkBlogReadme).toHaveText("blog/README");
    await expect(wikiLinkBlogReadme).toHaveAttribute(
      "href",
      `${publishedSitePage.siteUrlPath}/blog`,
    );

    const wikiLinkSpecialChars = publishedSitePage.page
      .getByTestId("obsidian-wiki-link-special-signs")
      .locator("a");
    await expect(wikiLinkSpecialChars).toHaveText(
      "Post With Special Chars %&(1)",
    );
    await expect(wikiLinkSpecialChars).toHaveAttribute(
      "href",
      `${publishedSitePage.siteUrlPath}/blog/Post+With+Special+Chars+%25%26(1)`,
    );

    const wikiLinkCase = publishedSitePage.page
      .getByTestId("obsidian-wiki-link-case-insensitive")
      .locator("a");
    await expect(wikiLinkCase).toHaveText("POST-1");
    await expect(wikiLinkCase).toHaveAttribute(
      "href",
      `${publishedSitePage.siteUrlPath}/blog/post-1`,
    );
  });
});

test("Obsidian embeds", async ({ publishedSitePage }) => {
  await publishedSitePage.goto("/syntax/links-and-embeds");

  const obsidianEmbed = publishedSitePage.page
    .getByTestId("obsidian-embed")
    .getByRole("img");
  await expect(obsidianEmbed).toHaveAttribute(
    "src",
    `${publishedSitePage.siteUrl}/_r/-/assets/image.jpg`,
  );

  const obsidianEmbedAbsolute = publishedSitePage.page
    .getByTestId("obsidian-embed-absolute")
    .getByRole("img");
  await expect(obsidianEmbedAbsolute).toHaveAttribute(
    "src",
    `${publishedSitePage.siteUrl}/_r/-/assets/image.jpg`,
  );

  const obsidianEmbedSpecialChars = publishedSitePage.page
    .getByTestId("obsidian-embed-special-signs")
    .getByRole("img");
  await expect(obsidianEmbedSpecialChars).toHaveAttribute(
    "src",
    `${publishedSitePage.siteUrl}/_r/-/assets/Image%20With%20Special%20Chars%20%25%26(1).jpg`,
  );
});

test("CommonMark links", async ({ publishedSitePage }) => {
  await publishedSitePage.goto("/syntax/links-and-embeds");

  const commonMarkLinks = publishedSitePage.page
    .getByTestId("common-mark-links")
    .getByRole("link");

  const simpleRelativeLink = commonMarkLinks.getByText("/blog/post-1");
  await expect(simpleRelativeLink).toHaveAttribute(
    "href",
    `${publishedSitePage.siteUrlPath}/blog/post-1`,
  );

  const relativeLinkWithDotSlash = commonMarkLinks.getByText("./syntax");
  await expect(relativeLinkWithDotSlash).toHaveAttribute(
    "href",
    `${publishedSitePage.siteUrlPath}/syntax/syntax`,
  );

  // const absoluteLink = commonMarkLinks.getByText("syntax");
  // await expect(absoluteLink).toHaveAttribute(
  //   "href",
  //   `${publishedSitePage.siteUrlPath}/syntax/syntax`,
  // );

  // const absoluteLinkToRootReadme = commonMarkLinks.getByText("/README");
  // await expect(absoluteLinkToRootReadme).toHaveText("/README");
  // await expect(absoluteLinkToRootReadme).toHaveAttribute(
  //   "href",
  //   `${publishedSitePage.siteUrlPath}`,
  // );

  const backwardLinkToRootReadme = commonMarkLinks.getByText("../README");
  await expect(backwardLinkToRootReadme).toHaveAttribute(
    "href",
    `${publishedSitePage.siteUrlPath}`,
  );

  const externalLink = commonMarkLinks.getByText("External link");
  await expect(externalLink).toHaveAttribute("href", "https://example.com");

  const linkWithSpaces = commonMarkLinks.getByText("with spaces");
  await expect(linkWithSpaces).toHaveAttribute(
    "href",
    `${publishedSitePage.siteUrlPath}/some/path/with+spaces`,
  );
});

test("CommonMark images", async ({ publishedSitePage }) => {
  await publishedSitePage.goto("/syntax/links-and-embeds");

  const commonMarkImages = publishedSitePage.page
    .getByTestId("common-mark-embeds")
    .getByRole("img");

  const backwardPathImage = commonMarkImages.nth(0);
  await expect(backwardPathImage).toHaveAttribute(
    "src",
    `${publishedSitePage.siteUrl}/_r/-/assets/image.jpg`,
  );

  const absolutePathImage = commonMarkImages.nth(1);
  await expect(absolutePathImage).toHaveAttribute(
    "src",
    `${publishedSitePage.siteUrl}/_r/-/assets/image.jpg`,
  );
});

// test.describe.configure({ mode: "parallel" });

// const linkBaseUrl = `/${testSite}`;
// const imagePath = `/${testSite}/_r/-/assets/image.jpg`;

// test("URL with spaces encoded as +", async ({ page }) => {
//   await page.goto(testSite + `/blog/Post+With+Special+Signs+%25%26(1)%2B`);
//   await expect(page.getByRole("heading")).toHaveText("Post with special signs");
// });

// test("URL with spaces encoded as %20", async ({ page }) => {
//   await page.goto(
//     testSite + `/blog/Post%20With%20Special%20Signs%20%25%26(1)%2B`,
//   );
//   await expect(page.getByRole("heading")).toHaveText("Post with special signs");

//   // test that %20 spaces in the URL has been replaced with + signs
//   await page.waitForURL(
//     `/${testSite}/blog/Post+With+Special+Signs+%25%26(1)%2B`,
//   );
// });

// test("MDX parsing error should be displayed on the page", async ({ page }) => {
//   const responsePromise = page.waitForResponse(testSite + `/blog/mdx-error`);
//   await page.goto(testSite + `/blog/mdx-error`);
//   const response = await responsePromise;
//   expect(response.status()).toBe(200);

//   const error = page.getByTestId("mdx-error");
//   await expect(error).toHaveText(/\[next-mdx-remote\] error compiling MDX/);
// });

test.describe("MDX", () => {
  test("Should resolve JSX href and src attributes", async ({
    publishedSitePage,
  }) => {
    await publishedSitePage.goto("/syntax/links-and-embeds");
    await expect(
      publishedSitePage.page.getByTestId("jsx-img").locator("img"),
    ).toHaveAttribute("src", /\/@.+\/.+\/_r\/-\/.+/);
  });

  test("List component", async ({ publishedSitePage }) => {
    await publishedSitePage.goto("/blog");
    const listItemLink = publishedSitePage.page
      .locator(".list-component-item")
      .getByRole("link", { name: "Blog Post 1" });
    await expect(listItemLink).toHaveAttribute(
      "href",
      publishedSitePage.siteUrlPath + "/blog/post-with-metadata",
    );
  });

  test("MDX variables", async ({ publishedSitePage }) => {
    await publishedSitePage.goto("/syntax/mdx-variables");

    await expect(publishedSitePage.page.getByText("44 million")).toBeVisible();
    await expect(
      publishedSitePage.page.getByText("$119 trillion"),
    ).toBeVisible();
    await expect(publishedSitePage.page.getByText("46,000")).toBeVisible();
  });
});
