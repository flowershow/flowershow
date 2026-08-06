import { expect, test } from '../helpers/fixtures';

// End-to-end guard for inline canvas embeds. Unlike the unit/integration tests
// (which build a pipeline by hand), this drives the *real* rendering pipeline,
// so it also catches regressions the hand-built tests can't — e.g. someone
// reordering or removing rehype-json-canvas in lib/markdown.ts.
//
// Regression context: the link resolver strips the `.canvas` extension from the
// image src, so the embed used to fall through to a (broken) next/image instead
// of rendering the canvas diagram.
test('Inline canvas embeds render as diagrams, not broken images', async ({
  page,
  basePath,
}) => {
  await page.goto(`${basePath}/canvas-embed`);
  const content = page.locator('#mdxpage');

  const cases = [
    { label: 'wiki ![[x.canvas]]', testId: 'wiki-canvas-embed' },
    { label: 'markdown ![](x.canvas)', testId: 'md-canvas-embed' },
  ] as const;

  for (const { label, testId } of cases) {
    await test.step(`${label} renders an inline canvas diagram`, async () => {
      const embed = content.getByTestId(testId);
      await embed.scrollIntoViewIfNeeded();

      // Rendered by the canvas plugin: a .canvas-embed container with an SVG
      // diagram and the node's markdown text.
      const canvas = embed.locator('.canvas-embed');
      await expect(canvas).toHaveCount(1);
      await expect(canvas).not.toHaveClass(/canvas-missing|canvas-error/);
      await expect(canvas.locator('svg').first()).toBeVisible();
      await expect(embed.getByText('Canvas E2E Node')).toBeVisible();

      // The regression symptom: the embed fell through to an <img> (broken
      // next/image). There must be no image inside the embed.
      await expect(embed.locator('img')).toHaveCount(0);
    });
  }
});
