import { test, expect, Page } from "@playwright/test";

import "dotenv/config";

test.describe.configure({ mode: "parallel" });

test.describe("README with datapackage.json", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(
      `${process.env.E2E_TEST_SITE!}/datasets/with-datapackage-json`,
    );
    // await page.waitForLoadState("networkidle");
  });
  test.afterAll(async () => {
    await page.close();
  });

  test("Title, description and README body", async () => {
    await expect(page.locator("h1").first()).toHaveText(
      "Datapackage with datapackage.json title",
    );

    const description = page.getByTestId("dp-description");
    await expect(description).toContainText(
      "Datapackage with datapackage.json description",
    );
    await expect(
      description.getByRole("link", { name: "Read more" }),
    ).toBeVisible();
    await expect(
      description.getByRole("link", { name: "Read more" }),
    ).toHaveAttribute("href", "#readme");

    const readme = page.getByTestId("dp-readme");
    await expect(readme).toHaveAttribute("id", "readme");
    await expect(readme).toBeVisible();
    await expect(readme).toContainText(
      "Datapackage with datapackage.json description",
    );
  });

  test("Metadata table", async () => {
    const metadataTable = page.getByTestId("dp-metadata-table");

    await expect(metadataTable.locator("th").nth(0)).toContainText("Files");
    await expect(metadataTable.locator("td").nth(0)).toContainText("2");

    await expect(metadataTable.locator("th").nth(1)).toContainText("Size");
    await expect(metadataTable.locator("td").nth(1)).toContainText("200 kB");

    await expect(metadataTable.locator("th").nth(2)).toContainText("Format");
    await expect(metadataTable.locator("td").nth(2)).toContainText("csv");

    await expect(metadataTable.locator("th").nth(3)).toContainText("Created");
    await expect(metadataTable.locator("td").nth(3)).toBeEmpty();

    await expect(metadataTable.locator("th").nth(4)).toContainText("Updated");
    await expect(metadataTable.locator("td").nth(4)).toBeEmpty();

    await expect(metadataTable.locator("th").nth(5)).toContainText("License");
    await expect(metadataTable.locator("td").nth(5)).toContainText(
      "License 1 Title",
    );
    await expect(
      metadataTable.locator("td").nth(5).locator("a"),
    ).toHaveAttribute("href", "https://license-1.com");

    await expect(metadataTable.locator("th").nth(6)).toContainText("Source");
    await expect(metadataTable.locator("td").nth(6)).toContainText(
      "Source 1 Title",
    );
    await expect(
      metadataTable.locator("td").nth(6).locator("a"),
    ).toHaveAttribute("href", "https://source-1.com");
  });

  test("Data views", async () => {
    const dataViews = page.getByTestId("dp-views");
    await expect(
      dataViews.getByRole("heading", { name: "Data Views" }),
    ).toBeVisible();

    await expect(async () => {
      const count = await dataViews.locator(".vega-embed").count();
      expect(count).toBe(1);
    }).toPass({
      timeout: 30000,
    });
  });

  test("Data files table", async () => {
    const dataFiles = page.getByTestId("dp-files");
    await expect(
      dataFiles.getByRole("heading", { name: "Data Files" }),
    ).toBeVisible();
    const dataFilesTable = dataFiles.getByRole("table");
    await expect(dataFilesTable).toBeVisible();
    expect(await dataFilesTable.locator("tbody").locator("tr").count()).toBe(2);

    // test first row
    await expect(dataFilesTable.locator("th").nth(0)).toContainText("File");
    await expect(
      dataFilesTable.locator("tbody").locator("tr").nth(0).locator("td").nth(0),
    ).toContainText("resource-1");
    await expect(
      dataFilesTable
        .locator("tbody")
        .locator("tr")
        .nth(0)
        .locator("td")
        .nth(0)
        .getByRole("link"),
    ).toHaveAttribute("href", "#resource-1");

    // await expect(dataFilesTable.locator("th").nth(1)).toContainText("Description");
    // await expect(dataFilesTable.locator("tr").nth(0).locator("td").nth(1)).toContainText("Some description");

    await expect(dataFilesTable.locator("th").nth(2)).toContainText("Size");
    await expect(
      dataFilesTable.locator("tbody").locator("tr").nth(0).locator("td").nth(2),
    ).toContainText("165 kB");

    // await expect(dataFilesTable.locator("th").nth(3)).toContainText("Last modified");
    // await expect(dataFilesTable.locator("tr").nth(0).locator("td").nth(3)).toContainText("2021-09-01");

    await expect(dataFilesTable.locator("th").nth(4)).toContainText("Download");
    const resouce1DownloadLink = dataFilesTable
      .locator("tbody")
      .locator("tr")
      .nth(0)
      .locator("td")
      .nth(4)
      .locator("a")
      .first();
    await expect(resouce1DownloadLink).toContainText("resource-1");
    await expect(resouce1DownloadLink).toHaveAttribute(
      "href",
      `/${process.env
        .E2E_TEST_SITE!}/_r/-/datasets/with-datapackage-json/data/resource-1.csv`,
    );

    const downloadPromise = page.waitForEvent("download");
    await resouce1DownloadLink.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("resource-1.csv");
  });

  test("Data previews", async () => {
    const dataPreviews = page.getByTestId("dp-previews");
    await expect(
      dataPreviews.getByRole("heading", { name: "Data Previews" }),
    ).toBeVisible();
    expect(await dataPreviews.getByTestId("dp-preview").count()).toBe(2);

    // test first preview
    const preview1 = dataPreviews.getByTestId("dp-preview").nth(0);
    await expect(
      preview1.getByRole("heading", { name: "resource-1" }),
    ).toBeVisible();
    // expect(preview1.locator(".github-octo-flat-ui")).toBeVisible();
  });

  test("Show Repository Link", async () => {
    const gotoRepo = page.getByTestId("goto-repository");
    await expect(gotoRepo).toBeVisible();
    await expect(gotoRepo.locator("a")).toContainText(
      "datahub-cloud-test-repo",
    );
    await expect(gotoRepo.locator("a")).toHaveAttribute(
      "href",
      `https://github.com/datopian/datahub-cloud-test-repo`,
    );
  });

  test("Show Edit Page Link", async () => {
    const editPage = page.getByTestId("edit-page-btn");
    await expect(editPage.locator("a")).toBeVisible();
    await expect(editPage.locator("a")).toHaveAttribute(
      "href",
      "https://github.com/datopian/datahub-cloud-test-repo/edit/main/datasets/with-datapackage-json/README.md",
    );
  });
});

// Simplified version of the previous test as content is the same
test.describe("README with frontmatter datapackage", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(
      `${process.env.E2E_TEST_SITE!}/datasets/with-datapackage-frontmatter`,
    );
    // await page.waitForLoadState("networkidle");
  });
  test.afterAll(async () => {
    await page.close();
  });

  test("Data views", async () => {
    const dataViews = page.getByTestId("dp-views");
    await expect(
      dataViews.getByRole("heading", { name: "Data Views" }),
    ).toBeVisible();
    await expect(async () => {
      const count = await dataViews.locator(".vega-embed").count();
      expect(count).toBe(1);
    }).toPass({
      timeout: 30000, // Timeout in milliseconds (30 seconds in this example)
    });
    // expect(await dataViews.locator(".vega-embed").count()).toBe(1);
  });

  test("Data files table", async () => {
    const dataFiles = page.getByTestId("dp-files");
    expect(await dataFiles.locator("tbody").locator("tr").count()).toBe(2);
  });

  test("Data previews", async () => {
    const dataPreviews = page.getByTestId("dp-previews");
    expect(await dataPreviews.getByTestId("dp-preview").count()).toBe(2);
  });
});
