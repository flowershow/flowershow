import { test, expect } from "../_fixtures/published-site-test";

test.describe("Site configuration in `config.json`", () => {
  test("Folders in `contentExclude` are not published", async ({
    publishedSitePage,
  }) => {
    const response = await publishedSitePage.goto(
      "/blog/archive/archived-post",
    );
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(404);
    await expect(publishedSitePage.page.getByText("404")).toBeVisible();
  });

  test("Files in `contentExclude` are not published", async ({
    publishedSitePage,
  }) => {
    const response = await publishedSitePage.goto("/blog/draft-post");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(404);
    await expect(publishedSitePage.page.getByText("404")).toBeVisible();
  });

  test("File with `publish: false` is not published", async ({
    publishedSitePage,
  }) => {
    const response = await publishedSitePage.goto(
      "/blog/draft-post-with-publish-false",
    );
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(404);
    await expect(publishedSitePage.page.getByText("404")).toBeVisible();
  });

  test("Should handle permanent redirects", async ({ publishedSitePage }) => {
    const [redirectResponse] = await Promise.all([
      publishedSitePage.page.waitForResponse(
        (res) => res.url().endsWith("/old-page") && res.status() === 308,
      ),
      publishedSitePage.goto("/old-page"),
    ]);
    expect(redirectResponse.status()).toBe(308);
    expect(redirectResponse.headers()["location"]).toMatch(/\/new-page$/);
  });

  test("Should handle temporary redirects", async ({ publishedSitePage }) => {
    const [redirectResponse] = await Promise.all([
      publishedSitePage.page.waitForResponse(
        (res) => res.url().endsWith("/temp-old") && res.status() === 307,
      ),
      publishedSitePage.goto("/temp-old"),
    ]);
    expect(redirectResponse.status()).toBe(307);
    expect(redirectResponse.headers()["location"]).toMatch(/\/temp-new$/);
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
    await publishedSitePage.goto("/syntax/syntax");
    await expect(
      publishedSitePage.page.getByTestId("jsx-img").locator("img"),
    ).toHaveAttribute("src", /\/@.+\/.+\/_r\/-\/.+/);
  });
});

test("Should display frontmatter metadata in the header", async ({
  publishedSitePage,
}) => {
  await publishedSitePage.goto("/blog/post-with-metadata");

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

test("Should render List component correctly", async ({
  publishedSitePage,
}) => {
  await publishedSitePage.goto("/blog");
  const list = publishedSitePage.page.locator("#list-component");
  await expect(list).toBeVisible();
  const blogPost1 = list.locator("article").first();
  await expect(blogPost1.locator("a")).toHaveAttribute(
    "href",
    `${publishedSitePage.siteUrlPath}/blog/post-with-metadata`,
  );
});
