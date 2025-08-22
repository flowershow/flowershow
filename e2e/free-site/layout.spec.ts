import { env } from "@/env.mjs";
import { test, expect } from "../_fixtures/published-site-test";

test.describe("Site layout", () => {
  test("Navbar", async ({ publishedSitePage }) => {
    await publishedSitePage.goto("/");

    const navbar = publishedSitePage.page.locator(".site-navbar");
    await expect(navbar).toBeVisible();

    // Site title and logo
    const navTitle = navbar.locator(".site-navbar-site-title");
    await expect(navTitle).toHaveAttribute(
      "href",
      publishedSitePage.siteUrlPath,
    );
    await expect(navTitle).toContainText("SiteName");
    const navLogo = navTitle.getByRole("img");
    await expect(navLogo).toHaveAttribute(
      "src",
      publishedSitePage.siteUrl + "/_r/-/logo.jpg",
    );
    // Check navigation links
    const navLinks = navbar.locator(".site-navbar-links-container");
    await expect(navLinks.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      `${publishedSitePage.siteUrlPath}/about`,
    );
    // Check social links if configured
    const socialLinks = navbar.locator(".navbar-social-links-container");
    await expect(navLinks.getByRole("link")).toHaveAttribute(
      "href",
      "https://discord.link/abc",
    );
  });

  // test("Sidebar", async ({ publishedSitePage }) => {
  //   await publishedSitePage.goto("/");

  //   const sidebar = publishedSitePage.page.locator(".site-sidebar");
  //   await expect(sidebar).toBeVisible();

  //   const sidebarLink = sidebar.getByRole("link", { name: "Blog Index" });
  //   await expect(sidebarLink).toHaveAttribute(
  //     "href",
  //     publishedSitePage.siteUrlPath + "/blog",
  //   );
  // });

  // test("applies fallback values correctly", async ({ page }) => {
  //   await page.goto(testSite);

  //   // Title should fallback to project name if not in config
  //   const title = await page.title();
  //   expect(title).toBeTruthy();

  //   // Description should be empty string if not in config
  //   const description = await page
  //     .locator('meta[name="description"]')
  //     .getAttribute("content");
  //   expect(description).toBeDefined();

  //   // Nav links should be empty array if not in config
  //   const navLinks = page.getByTestId("nav-links");
  //   if ((await navLinks.count()) > 0) {
  //     const links = await navLinks.locator("a").count();
  //     expect(links).toBeGreaterThanOrEqual(0);
  //   }
  // });

  // test("Branding elements", async ({ publishedSitePage }) => {
  //   await publishedSitePage.page.goto("/");

  //   // Should show built-with button
  //   const builtWithButton =
  //     publishedSitePage.page.locator("#built-with-button");
  //   await expect(builtWithButton).toBeVisible();
  //   await expect(builtWithButton).toContainText("Flowershow Cloud");
  // });
});
