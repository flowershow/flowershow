import { expect, test } from '../helpers/fixtures';

// The /bases-features page renders four `base` blocks, each producing one
// ObsidianBasesViews container (rendered with the `not-prose` class). The page
// has no other images or MDX lists, so `.not-prose` maps 1:1 to the blocks in
// document order:
//   0 — "Everything"        (list, no filters → whole vault)      → gap #1
//   1 — "Favorites"         (table, hasTag + formulas)            → gaps #2/#3/#4
//   2 — "Linked to target"  (list, file.hasLink)                  → gap #2
//   3 — "Backlink count"    (table, file.backlinks)               → gap #4
test.describe('Obsidian Bases feature coverage', () => {
  test.beforeEach(async ({ page, basePath }) => {
    await page.goto(`${basePath}/bases-features`);
    await expect(page.locator('#mdxpage')).toBeVisible();
  });

  const block = (page: any, index: number) =>
    page.locator('#mdxpage .not-prose').nth(index);

  test('empty filters return the whole vault, not nothing (gap #1)', async ({
    page,
  }) => {
    const everything = block(page, 0);

    // The old behavior returned [] for a filter-less base ("No results found").
    await expect(everything).not.toContainText('No results found');

    // Whole vault ⇒ both a root-level page and a nested book are present.
    await expect(
      everything.getByRole('link', { name: 'tables', exact: true }),
    ).toBeVisible();
    await expect(
      everything.getByRole('link', { name: 'dune', exact: true }),
    ).toBeVisible();
  });

  test('file.hasTag filters, with file.* + date-duration formulas (gaps #2/#3/#4)', async ({
    page,
  }) => {
    const favorites = block(page, 1);

    await test.step('hasTag("favorite") keeps the two tagged books', async () => {
      await expect(favorites).toContainText('Frank Herbert'); // Dune
      await expect(favorites).toContainText('F. Scott Fitzgerald'); // Gatsby
    });

    await test.step('hasTag excludes the untagged book (Sapiens)', async () => {
      await expect(favorites).not.toContainText('Yuval Noah Harari');
    });

    await test.step('file.tags formula renders the tag list', async () => {
      await expect(favorites).toContainText('favorite');
    });

    await test.step('file.basename formula includes the extension', async () => {
      await expect(favorites).toContainText('dune.md');
    });

    await test.step('date(added) + "1M" formula computes the deadline month', async () => {
      // Dune: added 2024-01-15 → +1 month → 2024-02
      await expect(favorites).toContainText('2024-02');
      // Gatsby: added 2024-02-20 → +1 month → 2024-03
      await expect(favorites).toContainText('2024-03');
    });
  });

  test('file.hasLink filters to notes linking the target (gap #2)', async ({
    page,
  }) => {
    const linked = block(page, 2);

    await test.step('all three seeded sources link to the target', async () => {
      for (const name of [
        'backlinks-source-1',
        'backlinks-source-2',
        'backlinks-source-3',
      ]) {
        await expect(
          linked.getByRole('link', { name, exact: true }),
        ).toBeVisible();
      }
    });

    await test.step('the target itself and unrelated notes are excluded', async () => {
      await expect(
        linked.getByRole('link', { name: 'backlinks-target', exact: true }),
      ).toHaveCount(0);
      await expect(
        linked.getByRole('link', { name: 'dune', exact: true }),
      ).toHaveCount(0);
    });
  });

  test('file.backlinks resolves incoming links (gap #4)', async ({ page }) => {
    const backlinkCount = block(page, 3);

    await expect(backlinkCount).toContainText('backlinks-target');
    // source-1, source-2, source-3 (source-3 is linked twice; .unique() dedupes)
    await expect(backlinkCount).toContainText('3');
  });
});
