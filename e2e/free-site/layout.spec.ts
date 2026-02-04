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
    const socialLinkElements = socialLinks.getByRole('link');
    await expect(socialLinkElements).toHaveCount(3);
    await expect(socialLinkElements.nth(0)).toHaveAttribute(
      'href',
      'https://discord.link/abc',
    );
    await expect(socialLinkElements.nth(1)).toHaveAttribute(
      'href',
      'https://github.com/flowershow/test',
    );
    await expect(socialLinkElements.nth(2)).toHaveAttribute(
      'href',
      'mailto:myemail@mail.com',
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

  test('Footer', async ({ publishedSitePage }) => {
    await publishedSitePage.goto('/');

    const footer = publishedSitePage.page.locator('.site-footer');
    await expect(footer).toBeVisible();

    // Site name
    const siteName = footer.locator('.site-footer-publication-name');
    await expect(siteName).toContainText('Test site title');

    // Copyright text with current year
    const copyright = footer.locator('.site-footer-copyright');
    const currentYear = new Date().getFullYear().toString();
    await expect(copyright).toContainText(currentYear);
    await expect(copyright).toContainText('Test site title');

    // Social links
    const socialLinks = footer.locator('.site-footer-social-links');
    const socialLinkElements = socialLinks.locator('.site-footer-social-link');
    await expect(socialLinkElements).toHaveCount(3);
    await expect(socialLinkElements.nth(0)).toHaveAttribute(
      'href',
      'https://discord.link/abc',
    );
    await expect(socialLinkElements.nth(1)).toHaveAttribute(
      'href',
      'https://github.com/flowershow/test',
    );
    await expect(socialLinkElements.nth(2)).toHaveAttribute(
      'href',
      'mailto:myemail@mail.com',
    );

    // Navigation groups
    const navigationSection = footer.locator('.site-footer-navigation-section');
    await expect(navigationSection).toBeVisible();

    // Resources group
    const resourcesGroup = navigationSection.locator(
      '.site-footer-navigation-group',
      { hasText: 'Resources' },
    );
    await expect(resourcesGroup).toBeVisible();
    await expect(
      resourcesGroup.getByRole('link', { name: 'Guides' }),
    ).toHaveAttribute('href', `${publishedSitePage.siteUrlPath}/guides`);
    await expect(
      resourcesGroup.getByRole('link', { name: 'Blog' }),
    ).toHaveAttribute('href', `${publishedSitePage.siteUrlPath}/blog`);

    // Company group
    const companyGroup = navigationSection.locator(
      '.site-footer-navigation-group',
      { hasText: 'Company' },
    );
    await expect(companyGroup).toBeVisible();
    await expect(
      companyGroup.getByRole('link', { name: 'About' }),
    ).toHaveAttribute('href', `${publishedSitePage.siteUrlPath}/about`);
    await expect(
      companyGroup.getByRole('link', { name: 'Contact' }),
    ).toHaveAttribute('href', `${publishedSitePage.siteUrlPath}/contact`);
    await expect(
      companyGroup.getByRole('link', { name: 'Privacy Policy' }),
    ).toHaveAttribute('href', `${publishedSitePage.siteUrlPath}/privacy`);
  });
});
