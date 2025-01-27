import { test, expect } from "@playwright/test";
import { testSite } from "./test-utils";

test.describe.configure({ mode: "parallel" });

test.describe("Files with spaces and other special signs", () => {
  test("URL with spaces encoded as +", async ({ page }) => {
    await page.goto(testSite + `/blog/Post+With+Special+Signs+%25%26(1)%2B`);
    await expect(page.getByRole("heading")).toHaveText(
      "Post with special signs",
    );
  });

  test("URL with spaces encoded as %20", async ({ page }) => {
    await page.goto(
      testSite + `/blog/Post%20With%20Special%20Signs%20%25%26(1)%2B`,
    );
    await expect(page.getByRole("heading")).toHaveText(
      "Post with special signs",
    );

    // test that %20 spaces in the URL has been replaced with + signs
    await page.waitForURL(
      `${process.env.E2E_BASE_URL}/${testSite}/blog/Post+With+Special+Signs+%25%26(1)%2B`,
    );
  });

  test("Wiki link to a file with spaces and plus signs", async ({ page }) => {
    await page.goto(testSite + `/blog`);

    const wikiLink = page
      .getByTestId("obsidian-wiki-links-special-signs")
      .getByRole("link");

    await expect(wikiLink).toHaveText("Post With Special Signs %&(1)+");
    await expect(wikiLink).toHaveAttribute(
      "href",
      `/${testSite}/blog/Post+With+Special+Signs+%25%26(1)%2B`,
    );
  });

  test("MDX parsing error should be displayed on the page", async ({
    page,
  }) => {
    const responsePromise = page.waitForResponse(testSite + `/blog/mdx-error`);
    await page.goto(testSite + `/blog/mdx-error`);
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    const error = page.getByTestId("mdx-error");
    await expect(error).toHaveText(/\[next-mdx-remote\] error compiling MDX/);
  });
});
