import { test, expect } from "../_fixtures/published-site-test";

test.describe("Site configuration in `config.json`", () => {
  test("Folders in `contentExclude` are not published", async ({
    publishedSitePage,
  }) => {
    const response = await publishedSitePage.goto(
      "/blog/archive/archived-article",
    );
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(404);
    await expect(publishedSitePage.page.getByText("404")).toBeVisible();
  });

  test("Files in `contentExclude` are not published", async ({
    publishedSitePage,
  }) => {
    const response = await publishedSitePage.goto("/blog/draft-article");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(404);
    await expect(publishedSitePage.page.getByText("404")).toBeVisible();
  });

  test("File with `publish: false` is not published", async ({
    publishedSitePage,
  }) => {
    const response = await publishedSitePage.goto(
      "/blog/draft-article-with-publish-false",
    );
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(404);
    await expect(publishedSitePage.page.getByText("404")).toBeVisible();
  });
});

test.describe("Raw resource endpoints", () => {
  test("Should redirect to R2 and download the file if passed correct file path", async ({
    publishedSitePage,
  }) => {
    // const response = await request.get(`${testSite}/_r/-/assets/image.jpg`);
    const response = await publishedSitePage.goto("/_r/-/assets/image.jpg");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    expect(response!.headers()["content-type"]).toBe("image/jpeg");
  });
});

test.describe("MDX", () => {
  test("Should resolve JSX href and src attributes", async ({
    publishedSitePage,
  }) => {
    await publishedSitePage.goto("/syntax");
    await expect(
      publishedSitePage.page.getByTestId("jsx-img").locator("img"),
    ).toHaveAttribute("src", /\/@.+\/.+\/_r\/-\/.+/);
  });
});

test("Should display frontmatter metadata in the header", async ({
  publishedSitePage,
}) => {
  await publishedSitePage.goto("/blog/article-with-metadata");

  const header = publishedSitePage.page.getByTestId("blog-header");
  await expect(header.locator("time").first()).toHaveText("June 6, 2024");
  await expect(header.locator("h1").first()).toHaveText("Blog Post 1");
  await expect(header).toContainText("Blog Post 1 Description");

  const author = header.getByTestId("blog-author").first();
  await expect(author).toContainText("John Doe");
  await expect(author).toHaveAttribute(
    "href",
    `${publishedSitePage.siteUrlPath}/team/john-doe`,
  );
  await expect(author.locator("img")).toHaveAttribute(
    "src",
    `${publishedSitePage.siteUrlPath}/_r/-/team/john.jpg`,
  );
});
