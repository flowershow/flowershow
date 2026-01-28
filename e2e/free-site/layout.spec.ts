import { expect, test } from '../_fixtures/published-site-test';
import { decodedImageSrc } from '../_utils/utils';

test.describe('Site layout', () => {
  test('Navbar', async ({ publishedSitePage }) => {
    await publishedSitePage.goto('/');

    const navbar = publishedSitePage.page.locator('.site-navbar');
    await expect(navbar).toBeVisible();

    // Site title and logo
    const navTitle = navbar.locator('.site-navbar-site-title');
    await expect(navTitle).toHaveAttribute(
      'href',
      publishedSitePage.siteUrlPath,
    );
    await expect(navTitle).toContainText('SiteName');
    const navLogo = navTitle.getByRole('img');
    const navLogoSrc = await navLogo.getAttribute('src');
    expect(navLogoSrc).not.toBeNull();
    expect(decodedImageSrc(navLogoSrc!)).toBe(
      publishedSitePage.siteUrl + '/logo.jpg',
    );
    // Check navigation links
    const navLinks = navbar.locator('.site-navbar-links-container');
    await expect(navLinks.getByRole('link', { name: 'About' })).toHaveAttribute(
      'href',
      `${publishedSitePage.siteUrlPath}/about`,
    );
    // Check social links
    const socialLinks = navbar.locator('.site-navbar-social-links-container');
    await expect(socialLinks.getByRole('link')).toHaveAttribute(
      'href',
      'https://discord.link/abc',
    );
  });

  test('Sidebar', async ({ publishedSitePage }) => {
    await publishedSitePage.goto('/');

    const sidebar = publishedSitePage.page.locator('.site-sidebar');
    await expect(sidebar).toBeVisible();

    const sidebarLink = sidebar.getByRole('link', { name: 'Welcome!' });
    await expect(sidebarLink).toHaveAttribute(
      'href',
      publishedSitePage.siteUrlPath + '/',
    );
  });
});
