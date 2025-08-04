import { test, expect } from "../_fixtures/published-site-test";

test.describe("Free site sitemap", () => {
  test("Individual site sitemap should return valid XML", async ({
    publishedSitePage,
  }) => {
    const response = await publishedSitePage.goto("/sitemap.xml");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    expect(response!.headers()["content-type"]).toBe("application/xml");

    const text = await response!.text();
    expect(text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(text).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );

    // Should contain the site root URL
    const siteUrl = `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}${publishedSitePage.siteUrlPath}`;
    expect(text).toContain(`<loc>${siteUrl}</loc>`);

    // Should contain blog posts
    expect(text).toContain(`<loc>${siteUrl}/blog/post-with-metadata</loc>`);

    // Should not contain excluded content
    expect(text).not.toContain(`<loc>${siteUrl}/blog/draft-post</loc>`);
    expect(text).not.toContain(
      `<loc>${siteUrl}/blog/archive/archived-post</loc>`,
    );
  });

  test("Main sitemap should include the free site", async ({
    page,
    publishedSitePage,
  }) => {
    const response = await page.goto(
      `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/sitemap.xml`,
    );
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    expect(response!.headers()["content-type"]).toBe("application/xml");

    const text = await response!.text();
    expect(text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(text).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );

    // Should contain the free site's sitemap URL
    const siteUrl = `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}${publishedSitePage.siteUrlPath}`;
    expect(text).toContain(`<loc>${siteUrl}/sitemap.xml</loc>`);
  });
});
