import { test, expect } from "@playwright/test";
import { testSite, premiumSite } from "./test-utils";
import { getConfig } from "@/lib/app-config";

const config = getConfig();

test.describe("Site layout and configuration", () => {
  test("applies metadata from site config", async ({ page }) => {
    await page.goto(testSite);
    const navTitle = page.getByTestId("navbar-logo-link");
    await expect(navTitle).toBeVisible();
    await expect(navTitle).toHaveAttribute("href", `/${testSite}`);
    await expect(navTitle).toContainText("SiteName");

    // Check page title and meta description
    await expect(page).toHaveTitle("Page Title From Frontmatter");
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute(
      "content",
      "Page Description From Frontmatter",
    );

    // Check OpenGraph and Twitter meta tags
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Page Title From Frontmatter",
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute("content", "Page Description From Frontmatter");
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      "content",
      "Page Title From Frontmatter",
    );
    await expect(
      page.locator('meta[name="twitter:description"]'),
    ).toHaveAttribute("content", "Page Description From Frontmatter");

    // Check favicon and thumbnail
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      "href",
      config.favicon,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      config.thumbnail,
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      "content",
      config.thumbnail,
    );
  });

  test("applies navigation configuration", async ({ page }) => {
    await page.goto(testSite);

    const navbar = page.getByTestId("navbar");

    // Check nav title and logo
    await expect(navbar).toBeVisible();
    await expect(navbar.locator("img")).toHaveAttribute("src", /logo.jpg/);
    await expect(navbar).toContainText("SiteName");
    await expect(navbar.getByTestId("navbar-logo-link")).toHaveAttribute(
      "href",
      `/${testSite}`,
    );

    // Check navigation links
    await expect(navbar.getByRole("link", { name: "About" })).toBeVisible();
    await expect(navbar.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      `/${testSite}/about`,
    );
    await expect(navbar.getByRole("link", { name: "Docs" })).toBeVisible();
    await expect(navbar.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      `/${testSite}/docs`,
    );

    // Check social links if configured
    const socialLinks = page.getByTestId("navbar-socials").getByRole("link");
    await expect(await socialLinks.count()).toEqual(1);
    await expect(socialLinks.nth(0)).toHaveAttribute(
      "href",
      "https://discord.link/abc",
    );
  });

  test("applies layout configuration", async ({ page }) => {
    await page.goto(testSite);

    // Check sidebar is not visible by default (showSidebar: false)
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).not.toBeVisible();

    // Check custom CSS if present
    const customStyles = page.locator("style[data-custom-css]");
    if ((await customStyles.count()) > 0) {
      await expect(customStyles).toBeAttached();
    }
  });

  // test("applies correct layout with sidebar enabled", async ({ page }) => {
  //   // Note: You'll need to configure the test site to have showSidebar: true
  //   await page.goto(testSite);

  //   const sidebar = page.getByTestId("sidebar");
  //   if (await sidebar.isVisible()) {
  //     // Verify sidebar content
  //     // TODO
  //   }
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

  test("shows correct UI elements based on data request feature flag", async ({
    page,
  }) => {
    await page.goto(testSite);

    await expect(page.getByTestId("built-with-button")).toBeVisible();
    await expect(page.locator("footer")).toHaveText(/Built with/);
  });

  test("Branding elements visibility based on plan", async ({ page }) => {
    // Test FREE plan (branding visible)
    await page.goto(testSite);
    const navLogo = page.locator("nav img").first();

    // Should show built-with button
    const builtWithButton = page.getByTestId("built-with-button");
    await expect(builtWithButton).toBeVisible();
    await expect(builtWithButton).toContainText("Built with");

    // Test Premium plan (no branding)
    await page.goto(premiumSite);

    // Should not show built-with button
    await expect(builtWithButton).not.toBeVisible();
  });
});
