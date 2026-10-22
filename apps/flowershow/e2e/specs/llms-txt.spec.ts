import { expect, test } from '../helpers/fixtures';

test.describe('llms.txt', () => {
  test('serves a generated index of the site', async ({ page, basePath }) => {
    const response = await page.request.get(`${basePath}/llms.txt`);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain');

    const body = await response.text();

    await test.step('starts with the site name and description', () => {
      expect(body).toMatch(
        /^# E2E Test Site\n\n> Test site for E2E renderer tests\n/,
      );
    });

    await test.step('links pages to their Markdown source', () => {
      expect(body).toMatch(
        /^- \[Basic Syntax\]\(https?:\/\/[^)]+\/basic-syntax\.md\)(: .+)?$/m,
      );
      expect(body).toMatch(
        /^- \[Getting Started\]\(https?:\/\/[^)]+\/docs\/getting-started\.md\)(: .+)?$/m,
      );
    });

    await test.step('groups pages by top-level folder', () => {
      expect(body).toContain('\n## Pages\n');
      expect(body).toContain('\n## Docs\n');
    });

    await test.step('leaves out contentHide paths and HTML files', () => {
      expect(body).not.toContain('/docs/people/');
      expect(body).not.toContain('test.html');
    });
  });

  test('a listed .md link serves its Markdown', async ({ page, basePath }) => {
    const body = await (await page.request.get(`${basePath}/llms.txt`)).text();
    const link = body.match(/\((https?:\/\/[^)]+\/basic-syntax\.md)\)/)?.[1];
    expect(link).toBeTruthy();

    const md = await page.request.get(`${basePath}${new URL(link!).pathname}`);
    expect(md.status()).toBe(200);
    expect(await md.text()).toContain('title: Basic Syntax');
  });
});
