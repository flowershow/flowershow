import { test, expect } from "@playwright/test";

import "dotenv/config";

test.describe.configure({ mode: "parallel" });

test.describe("Files with spaces and plus signs", () => {
  test("URL with plus signs and spaces encoded as +", async ({ page }) => {
    await page.goto(
      process.env.E2E_TEST_SITE! +
        `/blog/%2B+Post+With+Spaces+and+Plus+Signs+%2B`,
    );
    await expect(page.getByRole("heading")).toHaveText(
      "Post with spaces and + signs",
    );
  });

  test("URL with plus signs and spaces encoded as %20", async ({ page }) => {
    await page.goto(
      process.env.E2E_TEST_SITE! +
        `/blog/%2B+Post+With+Spaces+and+Plus+Signs+%2B`,
    );
    await expect(page.getByRole("heading")).toHaveText(
      "Post with spaces and + signs",
    );

    // test that %20 spaces in the URL has been replaced with + signs
    expect(page.url()).toContain(`%2B+Post+With+Spaces+and+Plus+Signs+%2B`);
  });

  test("Wiki link to a file with spaces and plus signs", async ({ page }) => {
    await page.goto(process.env.E2E_TEST_SITE! + `/blog`);
    await expect(page.getByText("Post with spaces and + signs")).toBeVisible();

    const wikiLink = page
      .getByTestId("obsidian-wiki-links-spaces-and-pluses")
      .getByRole("link");

    await expect(wikiLink).toHaveText("+ Post With Spaces and Plus Signs +");
    await expect(wikiLink).toHaveAttribute(
      "href",
      `/${process.env.E2E_TEST_SITE}/blog/%2B+Post+With+Spaces+and+Plus+Signs+%2B`,
    );
  });
});
