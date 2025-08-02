import { test, expect } from "../_fixtures/published-site-test";

test.describe("MDX", () => {
  test("Should resolve JSX href and src attributes", async ({
    publishedSitePage,
  }) => {
    await publishedSitePage.goto("/syntax/syntax");
    await expect(
      publishedSitePage.page.getByTestId("jsx-img").locator("img"),
    ).toHaveAttribute("src", /^\/_r\/-\/.+/); // the test site it on custom domain
  });
});

test.describe("Site configuration in `config.json`", () => {
  test("Should handle permanent redirects", async ({ publishedSitePage }) => {
    const [redirectResponse] = await Promise.all([
      publishedSitePage.page.waitForResponse(
        (res) => res.url().endsWith("/old-page") && res.status() === 308,
      ),
      publishedSitePage.goto("/old-page"),
    ]);
    expect(redirectResponse.status()).toBe(308);
    expect(publishedSitePage.page.url()).toMatch(
      "http://test.localhost:3000/new-page",
    );
  });

  test("Should handle temporary redirects", async ({ publishedSitePage }) => {
    const [redirectResponse] = await Promise.all([
      publishedSitePage.page.waitForResponse(
        (res) => res.url().endsWith("/temp-old") && res.status() === 307,
      ),
      publishedSitePage.goto("/temp-old"),
    ]);
    expect(redirectResponse.status()).toBe(307);
    expect(publishedSitePage.page.url()).toMatch(
      "http://test.localhost:3000/temp-new",
    );
  });
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
