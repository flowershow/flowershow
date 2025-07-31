import { test, expect } from "../_fixtures/published-site-test";

test.describe("MDX", () => {
  test("Should resolve JSX href and src attributes", async ({
    publishedSitePage,
  }) => {
    await publishedSitePage.goto("/syntax");
    await expect(
      publishedSitePage.page.getByTestId("jsx-img").locator("img"),
    ).toHaveAttribute("src", /^\/_r\/-\/.+/); // the test site it on custom domain
  });
});
