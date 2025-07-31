// import { test, expect } from "@playwright/test";

// test.describe.configure({ mode: "parallel" });

// const linkBaseUrl = `/${testSite}`;
// const imagePath = `/${testSite}/_r/-/assets/image.jpg`;

// test("URL with spaces encoded as +", async ({ page }) => {
//   await page.goto(testSite + `/blog/Post+With+Special+Signs+%25%26(1)%2B`);
//   await expect(page.getByRole("heading")).toHaveText("Post with special signs");
// });

// test("URL with spaces encoded as %20", async ({ page }) => {
//   await page.goto(
//     testSite + `/blog/Post%20With%20Special%20Signs%20%25%26(1)%2B`,
//   );
//   await expect(page.getByRole("heading")).toHaveText("Post with special signs");

//   // test that %20 spaces in the URL has been replaced with + signs
//   await page.waitForURL(
//     `/${testSite}/blog/Post+With+Special+Signs+%25%26(1)%2B`,
//   );
// });

// test("Wiki link to a file with spaces and plus signs", async ({ page }) => {
//   await page.goto(testSite + `/blog`);

//   const wikiLink = page
//     .getByTestId("obsidian-wiki-links-special-signs")
//     .getByRole("link");

//   await expect(wikiLink).toHaveText("Post With Special Signs %&(1)+");
//   await expect(wikiLink).toHaveAttribute(
//     "href",
//     `/${testSite}/blog/Post+With+Special+Signs+%25%26(1)%2B`,
//   );
// });

// test("MDX parsing error should be displayed on the page", async ({ page }) => {
//   const responsePromise = page.waitForResponse(testSite + `/blog/mdx-error`);
//   await page.goto(testSite + `/blog/mdx-error`);
//   const response = await responsePromise;
//   expect(response.status()).toBe(200);

//   const error = page.getByTestId("mdx-error");
//   await expect(error).toHaveText(/\[next-mdx-remote\] error compiling MDX/);
// });

// test("Obsidian wiki-links", async () => {
//   const obsidianWikiLinks = page
//     .getByTestId("obsidian-wiki-links")
//     .getByRole("link");

//   const shortestPathLink = obsidianWikiLinks.nth(0);
//   await expect(shortestPathLink).toHaveText("post-1");
//   await expect(shortestPathLink).toHaveAttribute(
//     "href",
//     `${linkBaseUrl}/blog/post-1`,
//   );

//   const rootREADME = obsidianWikiLinks.nth(1);
//   await expect(rootREADME).toHaveText("README");
//   await expect(rootREADME).toHaveAttribute("href", `${linkBaseUrl}`);

//   const relativePathLink = obsidianWikiLinks.nth(2);
//   await expect(relativePathLink).toHaveText("./post-1");
//   await expect(relativePathLink).toHaveAttribute(
//     "href",
//     `${linkBaseUrl}/blog/post-1`,
//   );

//   const absolutePathLink = obsidianWikiLinks.nth(3);
//   await expect(absolutePathLink).toHaveText("/blog/post-1");
//   await expect(absolutePathLink).toHaveAttribute(
//     "href",
//     `${linkBaseUrl}/blog/post-1`,
//   );

//   const absolutePathLinkToRootReadme = obsidianWikiLinks.nth(4);
//   await expect(absolutePathLinkToRootReadme).toHaveText("/README");
//   await expect(absolutePathLinkToRootReadme).toHaveAttribute(
//     "href",
//     `${linkBaseUrl}`,
//   );

//   const backwardPathLinkToRootReadme = obsidianWikiLinks.nth(5);
//   await expect(backwardPathLinkToRootReadme).toHaveText("../README");
//   await expect(backwardPathLinkToRootReadme).toHaveAttribute(
//     "href",
//     `${linkBaseUrl}`,
//   );

//   const linkWithExtension = obsidianWikiLinks.nth(6);
//   await expect(linkWithExtension).toHaveText("/blog/post-1.md");
// });

// test("Obsidian embeds", async () => {
//   const obsidianEmbeds = page.getByTestId("obsidian-embeds").getByRole("img");

//   const shortestPathEmbed = obsidianEmbeds.nth(0);
//   await expect(shortestPathEmbed).toHaveAttribute("src", imagePath);

//   const backwardPathEmbed = obsidianEmbeds.nth(1);
//   await expect(backwardPathEmbed).toHaveAttribute("src", imagePath);

//   const absolutePathEmbed = obsidianEmbeds.nth(2);
//   await expect(absolutePathEmbed).toHaveAttribute("src", imagePath);
// });

// test("CommonMark links", async () => {
//   const commonMarkLinks = page
//     .getByTestId("common-mark-links")
//     .getByRole("link");

//   const simpleRelativeLink = commonMarkLinks.nth(0);
//   await expect(simpleRelativeLink).toHaveText("post-1");
//   await expect(simpleRelativeLink).toHaveAttribute(
//     "href",
//     `${linkBaseUrl}/blog/post-1`,
//   );

//   const relativeLinkWithDotSlash = commonMarkLinks.nth(1);
//   await expect(relativeLinkWithDotSlash).toHaveText("./post-1");
//   await expect(relativeLinkWithDotSlash).toHaveAttribute(
//     "href",
//     `${linkBaseUrl}/blog/post-1`,
//   );

//   const absoluteLink = commonMarkLinks.nth(2);
//   await expect(absoluteLink).toHaveText("/blog/post-1");
//   await expect(absoluteLink).toHaveAttribute(
//     "href",
//     `${linkBaseUrl}/blog/post-1`,
//   );

//   const absoluteLinkToRootReadme = commonMarkLinks.nth(3);
//   await expect(absoluteLinkToRootReadme).toHaveText("/README");
//   await expect(absoluteLinkToRootReadme).toHaveAttribute(
//     "href",
//     `${linkBaseUrl}`,
//   );

//   const backwardLinkToRootReadme = commonMarkLinks.nth(4);
//   await expect(backwardLinkToRootReadme).toHaveText("../README");
//   await expect(backwardLinkToRootReadme).toHaveAttribute(
//     "href",
//     `${linkBaseUrl}`,
//   );

//   const externalLink = commonMarkLinks.nth(5);
//   await expect(externalLink).toHaveText("External link");
//   await expect(externalLink).toHaveAttribute("href", "https://example.com");
// });

// test("CommonMark images", async () => {
//   const commonMarkImages = page
//     .getByTestId("common-mark-embeds")
//     .getByRole("img");

//   const backwardPathImage = commonMarkImages.nth(0);
//   await expect(backwardPathImage).toHaveAttribute("src", imagePath);

//   const absolutePathImage = commonMarkImages.nth(1);
//   await expect(absolutePathImage).toHaveAttribute("src", imagePath);
// });
