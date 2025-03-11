import { test, expect, Page } from "@playwright/test";
import { testSite, githubScope, githubRepo } from "./test-utils";

test.describe.configure({ mode: "parallel" });

test.describe("README with datapackage.json", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(`${testSite}/datasets/with-datapackage-json`);
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("domcontentloaded");
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
    await expect(metadataTable.locator("td").nth(1)).toContainText("165 kB");

    await expect(metadataTable.locator("th").nth(2)).toContainText("Format");
    await expect(metadataTable.locator("td").nth(2)).toContainText("csv");

    await expect(metadataTable.locator("th").nth(3)).toContainText("Created");
    await expect(metadataTable.locator("td").nth(3)).toBeEmpty();

    await expect(metadataTable.locator("th").nth(4)).toContainText("Updated");
    // await expect(metadataTable.locator("td").nth(4)).not.toBeEmpty();

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

    await expect(dataFilesTable.locator("th").nth(0)).toContainText("File");
    await expect(dataFilesTable.locator("th").nth(1)).toContainText(
      "Description",
    );
    await expect(dataFilesTable.locator("th").nth(2)).toContainText("Size");
    await expect(dataFilesTable.locator("th").nth(3)).toContainText(
      "Last modified",
    );
    await expect(dataFilesTable.locator("th").nth(4)).toContainText("Download");

    // test first row
    const firstRow = dataFilesTable.locator("tbody").locator("tr").nth(0);
    await expect(firstRow.locator("td").nth(0)).toContainText("resource-1");
    await expect(
      firstRow.locator("td").nth(0).getByRole("link"),
    ).toHaveAttribute("href", "#resource-1");

    await expect(firstRow.locator("td").nth(2)).toContainText("165 kB");

    const resouce1DownloadLink = firstRow
      .locator("td")
      .nth(4)
      .locator("a")
      .first();
    await expect(resouce1DownloadLink).toContainText("resource-1");
    await expect(resouce1DownloadLink).toHaveAttribute(
      "href",
      `/${testSite}/_r/-/datasets/with-datapackage-json/data/resource-1.csv`,
    );

    const downloadPromise = page.waitForEvent("download");
    await resouce1DownloadLink.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("resource-1.csv");

    // test second row
    const secondRow = dataFilesTable.locator("tbody").locator("tr").nth(1);
    await expect(secondRow.locator("td").nth(0)).toContainText("resource-2");
    await expect(
      secondRow.locator("td").nth(0).getByRole("link"),
    ).toHaveAttribute("href", "#resource-2");

    await expect(secondRow.locator("td").nth(2)).toContainText("");

    const resouce2DownloadLink = secondRow
      .locator("td")
      .nth(4)
      .locator("a")
      .first();
    await expect(resouce2DownloadLink).toContainText("resource-2");
    await expect(resouce2DownloadLink).toHaveAttribute(
      "href",
      "https://external-data.org/resource-2.csv",
    );
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

  test("Resources schema", async () => {
    const dataPreviews = page.getByTestId("dp-previews");
    expect(await dataPreviews.getByTestId("dp-schema").count()).toBe(2);

    // test first schema
    const schema1 = dataPreviews.getByTestId("dp-schema").nth(0);
    await expect(
      schema1.getByRole("heading", { name: "Schema" }),
    ).toBeVisible();
    const schemaTable = schema1.getByRole("table");
    await expect(schemaTable).toBeVisible();
    expect(await schemaTable.locator("tbody").locator("tr").count()).toBe(2);
    const expectedHeaders = [
      "name",
      "type",
      "format",
      "decimalChar",
      "groupChar",
    ];
    expectedHeaders.forEach((header, index) => {
      expect(schemaTable.locator("th").nth(index)).toContainText(header);
    });
  });

  test("Show Repository Link", async () => {
    const gotoRepo = page.getByTestId("goto-repository");
    await expect(gotoRepo).toBeVisible();
    await expect(gotoRepo.locator("a")).toContainText(githubRepo);
    await expect(gotoRepo.locator("a")).toHaveAttribute(
      "href",
      `https://github.com/${githubScope}/${githubRepo}`,
    );
  });

  test("Show Edit Page Link", async () => {
    const editPage = page.getByTestId("edit-page-btn");
    await expect(editPage.locator("a")).toBeVisible();
    await expect(editPage.locator("a")).toHaveAttribute(
      "href",
      `https://github.com/${githubScope}/${githubRepo}/edit/main/datasets/with-datapackage-json/README.md`,
    );
  });
});

// Simplified version of the previous test as content is the same
test.describe("README with frontmatter datapackage", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(`${testSite}/datasets/with-datapackage-frontmatter`);
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("domcontentloaded");
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

  test("Resources schema", async () => {
    const dataPreviews = page.getByTestId("dp-previews");
    expect(await dataPreviews.getByTestId("dp-schema").count()).toBe(2);
  });
});
