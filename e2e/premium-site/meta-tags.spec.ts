import { test, expect } from "../_fixtures/published-site-test";

test.describe("Meta tags", () => {
  test("OpenGraph meta tags", async ({ publishedSitePage }) => {
    await publishedSitePage.goto("/blog/post-with-metadata");

    const ogTitle = await publishedSitePage.page
      .locator("meta[property='og:title']")
      .getAttribute("content");
    await expect(ogTitle).toBe("Blog Post 1 - Test site title");

    const ogDescription = await publishedSitePage.page
      .locator("meta[property='og:description']")
      .getAttribute("content");
    await expect(ogDescription).toBe("Blog Post 1 Description");

    const ogUrl = await publishedSitePage.page
      .locator("meta[property='og:url']")
      .getAttribute("content");
    await expect(ogUrl).toBe(
      `http://${publishedSitePage.domain}/blog/post-with-metadata`,
    );

    const ogImage = await publishedSitePage.page
      .locator("meta[property='og:image']")
      .getAttribute("content");
    await expect(ogImage).toBe(
      `http://${publishedSitePage.domain}/_r/-/assets/image.jpg`,
    );

    const ogType = await publishedSitePage.page
      .locator("meta[property='og:type']")
      .getAttribute("content");
    await expect(ogType).toBe("website");
  });

  test("OpenGraph meta tags (default values)", async ({
    publishedSitePage,
  }) => {
    await publishedSitePage.goto("/blog/post-without-metadata");

    const ogTitle = await publishedSitePage.page
      .locator("meta[property='og:title']")
      .getAttribute("content");
    await expect(ogTitle).toBe("Blog Post 2 - Test site title");

    const ogDescription = await publishedSitePage.page
      .locator("meta[property='og:description']")
      .getAttribute("content");
    await expect(ogDescription).toBe("Test site description");

    const ogUrl = await publishedSitePage.page
      .locator("meta[property='og:url']")
      .getAttribute("content");
    await expect(ogUrl).toBe(
      `http://${publishedSitePage.domain}/blog/post-without-metadata`,
    );

    // TODO this in theory is required but we don't set it to default on premium sites
    // const ogImage = await publishedSitePage.page
    //   .locator("meta[property='og:image']")
    //   .getAttribute("content");
    // await expect(ogImage).toBe(
    //   "https://r2-assets.flowershow.app/thumbnail.png",
    // );

    const ogType = await publishedSitePage.page
      .locator("meta[property='og:type']")
      .getAttribute("content");
    await expect(ogType).toBe("website");
  });
});
