import { test, expect } from "../_fixtures/published-site-test";

test.describe("Premium site sitemap", () => {
  test("Individual site sitemap should return valid XML with custom domain URLs", async ({
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

    // Should contain the site root URL with custom domain
    const siteUrl = `http://${publishedSitePage.customDomain}`;
    expect(text).toContain(`<loc>${siteUrl}</loc>`);

    // Should contain blog posts with custom domain URLs
    expect(text).toContain(`<loc>${siteUrl}/blog/post-with-metadata</loc>`);

    // Should not contain excluded content
    expect(text).not.toContain(`<loc>${siteUrl}/blog/draft-post</loc>`);
    expect(text).not.toContain(
      `<loc>${siteUrl}/blog/archive/archived-post</loc>`,
    );
  });

  test("Main sitemap should not include the premium site", async ({
    publishedSitePage,
  }) => {
    const response = await publishedSitePage.page.goto(
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

    // Should not contain the premium site's sitemap URL since it has a custom domain
    const siteUrl = `http://${publishedSitePage.customDomain}`;
    expect(text).not.toContain(`<loc>${siteUrl}/sitemap.xml</loc>`);
  });
});
