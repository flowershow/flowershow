import { expect, test } from '../helpers/fixtures';

// fixtures/test-site/_navbar.html is seeded into both the free site
// (`chromium` project) and the Premium site (`custom-domain` project). The
// custom navbar is a Premium feature (Feature.CustomNavbar): it replaces the
// default navbar content on Premium and is ignored on Free. On both,
// `_navbar.html` is never served at its own URL or listed as a page.
const NAVBAR_TEXT = 'E2E custom navbar';

const isPremiumProject = () => test.info().project.name === 'custom-domain';

type MarkedWindow = Window & { __navbarMarker?: boolean };

test.describe('Custom navbar on Premium', () => {
  test.beforeEach(() => {
    test.skip(!isPremiumProject(), 'Custom navbar is a Premium feature');
  });

  test('replaces the default navbar content', async ({ page, basePath }) => {
    await test.step('navbar HTML is server-rendered', async () => {
      const response = await page.request.get(`${basePath}/basic-syntax`);
      expect(response.ok()).toBeTruthy();
      const html = await response.text();
      expect(html).toContain(NAVBAR_TEXT);
      expect(html).toContain('id="unocss-navbar"');
    });

    // A nested page: relative links must resolve from the site root.
    await page.goto(`${basePath}/docs/getting-started`);
    const nav = page.locator('nav.site-navbar');

    await test.step('custom content replaces the config navbar', async () => {
      await expect(nav).toHaveClass(/site-navbar--custom/);
      await expect(nav).toHaveAttribute('aria-label', 'Main');
      await expect(nav).toContainText(NAVBAR_TEXT);
      // config.json nav title and links are not rendered.
      await expect(nav).not.toContainText('E2E Test Site');
      await expect(nav.locator('a', { hasText: 'About' })).toHaveCount(0);
      await expect(nav.locator('.site-navbar-mobile-nav-button')).toHaveCount(
        0,
      );
    });

    await test.step('links resolve from the site root on a nested page', async () => {
      await expect(
        nav.getByRole('link', { name: 'Basic syntax', exact: true }),
      ).toHaveAttribute('href', '/basic-syntax');
    });

    await test.step('the link to the current page has aria-current', async () => {
      await expect(
        nav.getByRole('link', { name: 'Getting started', exact: true }),
      ).toHaveAttribute('aria-current', 'page');
      await expect(
        nav.getByRole('link', { name: 'Home', exact: true }),
      ).not.toHaveAttribute('aria-current', 'page');
    });

    await test.step('Tailwind classes in the navbar are styled', async () => {
      await expect(nav.locator('.e2e-navbar-brand')).toHaveCSS(
        'font-weight',
        '700',
      );
      await expect(nav.locator('.e2e-navbar-links')).toHaveCSS(
        'display',
        'flex',
      );
      await expect(nav.locator('.e2e-navbar-menu')).toBeHidden();
    });

    await test.step('author classes beat the default link styles', async () => {
      // A `bg-black text-white` button that is also the current page keeps
      // its colours and weight: the defaults are `:where()`-wrapped.
      const cta = nav.locator('.e2e-navbar-cta');
      await expect(cta).toHaveAttribute('aria-current', 'page');
      await expect(cta).toHaveCSS('color', 'rgb(255, 255, 255)');
      await expect(cta).toHaveCSS('background-color', 'rgb(0, 0, 0)');
      await expect(cta).toHaveCSS('font-weight', '400');
      await cta.hover();
      await expect(cta).toHaveCSS('color', 'rgb(255, 255, 255)');
      await page.mouse.move(0, 400);
    });

    await test.step('page links navigate client-side', async () => {
      await page.evaluate(() => {
        (window as MarkedWindow).__navbarMarker = true;
      });
      await nav
        .getByRole('link', { name: 'Basic syntax', exact: true })
        .click();
      await expect(page).toHaveURL(/\/basic-syntax$/);
      expect(
        await page.evaluate(() => (window as MarkedWindow).__navbarMarker),
      ).toBe(true);
    });

    await test.step('file links stay plain links', async () => {
      await expect(nav.getByRole('link', { name: 'RSS feed' })).toHaveAttribute(
        'href',
        '/rss.xml',
      );
    });

    await test.step('the navbar stays sticky at the top', async () => {
      await page.mouse.wheel(0, 2000);
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeGreaterThan(0);
      const box = await nav.boundingBox();
      expect(box?.y).toBe(0);
    });

    await test.step('--navbar-height sets the navbar height', async () => {
      await page.addStyleTag({ content: ':root { --navbar-height: 5rem; }' });
      await expect(nav.locator('.site-navbar-inner')).toHaveCSS(
        'height',
        '80px',
      );
    });
  });

  test('a <details> menu works as the mobile menu at 390px', async ({
    page,
    basePath,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${basePath}/docs/getting-started`);
    const nav = page.locator('nav.site-navbar');
    const menu = nav.locator('details.e2e-navbar-menu');

    await test.step('the desktop links are hidden, the menu is shown', async () => {
      await expect(nav).toContainText(NAVBAR_TEXT);
      await expect(nav.locator('.e2e-navbar-links')).toBeHidden();
      await expect(menu.locator(':scope > summary')).toBeVisible();
    });

    await test.step('no page-level horizontal scroll', async () => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    await test.step('the menu opens below the bar without being clipped', async () => {
      await menu.locator(':scope > summary').click();
      await expect(menu).toHaveAttribute('open', '');
      const link = menu.getByRole('link', { name: 'Menu: basic syntax' });
      await expect(link).toBeVisible();
      const navBox = await nav.boundingBox();
      const panelBox = await menu.locator(':scope > ul').boundingBox();
      // The panel drops out of the bar: it extends below it, so the shell's
      // overflow-x: clip doesn't clip it vertically.
      expect(panelBox!.y + panelBox!.height).toBeGreaterThan(
        navBox!.y + navBox!.height,
      );
      expect(panelBox!.x).toBeGreaterThanOrEqual(0);
      expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(390);
      // The panel is on top, not hidden behind the clipped bar.
      await link.click({ trial: true });
    });

    await test.step('following a menu link closes the menu', async () => {
      await page.evaluate(() => {
        (window as MarkedWindow).__navbarMarker = true;
      });
      await menu.getByRole('link', { name: 'Menu: basic syntax' }).click();
      await expect(page).toHaveURL(/\/basic-syntax$/);
      await expect(menu).not.toHaveAttribute('open', '');
      expect(
        await page.evaluate(() => (window as MarkedWindow).__navbarMarker),
      ).toBe(true);
    });
  });

  test('menu panels: author direction classes win, submenus expand inline', async ({
    page,
    basePath,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${basePath}/docs/getting-started`);
    const menu = page.locator('nav.site-navbar details.e2e-navbar-menu');
    const panel = menu.locator(':scope > ul');
    await menu.locator(':scope > summary').click();
    await expect(menu).toHaveAttribute('open', '');

    // getComputedStyle resolves left/right of a positioned box to px, so
    // compare edges with the <details> instead.
    const edges = async () => {
      const m = (await menu.boundingBox())!;
      const p = (await panel.boundingBox())!;
      return {
        rightAligned: Math.abs(p.x + p.width - (m.x + m.width)) < 1,
        leftAligned: Math.abs(p.x - m.x) < 1,
      };
    };

    await test.step('the last menu opens leftwards by default', async () => {
      expect(await edges()).toMatchObject({ rightAligned: true });
    });

    await test.step('`left-0 right-auto` on the last panel wins', async () => {
      await panel.evaluate((el) => el.classList.add('left-0', 'right-auto'));
      expect(await edges()).toMatchObject({
        leftAligned: true,
        rightAligned: false,
      });
      await panel.evaluate((el) => el.classList.remove('left-0', 'right-auto'));
    });

    await test.step('a nested <details> expands inline in the panel', async () => {
      const submenu = menu.locator('details.e2e-navbar-submenu');
      await submenu.locator(':scope > summary').click();
      await expect(submenu).toHaveAttribute('open', '');
      // Opening the submenu keeps its parent menu open.
      await expect(menu).toHaveAttribute('open', '');
      const subPanel = submenu.locator(':scope > ul');
      await expect(subPanel).toHaveCSS('position', 'static');
      await expect(subPanel).toHaveCSS('box-shadow', 'none');
      const link = subPanel.getByRole('link', { name: 'Submenu: home' });
      await expect(link).toBeVisible();
      const panelBox = (await panel.boundingBox())!;
      const linkBox = (await link.boundingBox())!;
      expect(linkBox.y).toBeGreaterThanOrEqual(panelBox.y);
      expect(linkBox.y + linkBox.height).toBeLessThanOrEqual(
        panelBox.y + panelBox.height,
      );
    });
  });

  test('showNavbar: false hides the custom navbar too', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/docs/no-navbar`);
    await expect(page.locator('nav.site-navbar')).toBeHidden();
  });
});

test('Custom navbar is ignored on the free plan', async ({
  page,
  basePath,
}) => {
  test.skip(isPremiumProject(), 'Free-plan behaviour');

  await page.goto(`${basePath}/basic-syntax`);
  const nav = page.locator('nav.site-navbar');
  await expect(nav).not.toHaveClass(/site-navbar--custom/);
  await expect(nav).toContainText('About');
  await expect(nav).not.toContainText(NAVBAR_TEXT);
});

test('_navbar.html is not served or listed as a page', async ({
  page,
  basePath,
}) => {
  await test.step('/_navbar.html is a 404', async () => {
    const response = await page.request.get(`${basePath}/_navbar.html`);
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain(NAVBAR_TEXT);
  });

  await test.step('it is not linked from the sidebar tree or navigation', async () => {
    await page.goto(`${basePath}/docs/getting-started`);
    await expect(page.locator('.site-sidebar')).toBeVisible();
    await expect(page.locator('a[href*="_navbar"]')).toHaveCount(0);
  });

  await test.step('it is not in the sitemap', async () => {
    const response = await page.request.get(`${basePath}/sitemap.xml`);
    expect(response.ok()).toBeTruthy();
    expect(await response.text()).not.toContain('_navbar');
  });
});
