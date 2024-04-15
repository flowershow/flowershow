import { test, expect } from "@playwright/test";
import { BASE_URL } from "./constants";

import prisma from "@/server/db";
import { Site } from "@prisma/client";

type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};

let site: SiteWithUser | null = null;

test.describe("Datapackage page", () => {
  test.beforeAll(async () => {
    const siteId = process.env.E2E_SITE_ID;

    // TODO get from shared json?
    site = await prisma.site.findUnique({
      where: {
        id: siteId,
      },
      include: {
        user: true,
      },
    });
    if (!site) {
      throw new Error(`Site with id ${siteId} not found`);
    }
  });

  test("Datapackage layout", async ({ page }) => {
    // TODO replace hardcoded values with values from json
    await page.goto(
      `${BASE_URL}/@${site!.user!.gh_username}/${site!.projectName}`,
    );
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toHaveText("Some title");
    await expect(page.getByTestId("dp-description")).toContainText(
      "Some description",
    );

    const metadataTable = page.getByTestId("dp-metadata-table");

    await expect(metadataTable.locator("th").nth(0)).toContainText("Files");
    await expect(metadataTable.locator("td").nth(0)).toContainText("2");

    await expect(metadataTable.locator("th").nth(1)).toContainText("Size");
    await expect(metadataTable.locator("td").nth(1)).toContainText("200 kB");

    await expect(metadataTable.locator("th").nth(2)).toContainText("Format");
    await expect(metadataTable.locator("td").nth(2)).toContainText("csv");

    // await expect(metadataTable.locator("th").nth(3)).toContainText("Created");
    // await expect(metadataTable.locator("td").nth(3)).toContainText("2021-09-01");

    // await expect(metadataTable.locator("th").nth(4)).toContainText("Updated");
    // await expect(metadataTable.locator("td").nth(4)).toContainText("2021-09-01");

    await expect(metadataTable.locator("th").nth(5)).toContainText("License");
    await expect(metadataTable.locator("td").nth(5)).toContainText(
      "License 1 Title",
    );

    await expect(metadataTable.locator("th").nth(6)).toContainText("Source");
    await expect(metadataTable.locator("td").nth(6)).toContainText(
      "Source 1 Title",
    );

    const description = page.getByTestId("dp-description");
    await expect(description).toContainText("Some description ...");
    await expect(
      description.getByRole("link", { name: "Read more" }),
    ).toBeVisible();
    await expect(
      description.getByRole("link", { name: "Read more" }),
    ).toHaveAttribute("href", "#readme");

    const dataViews = page.getByTestId("dp-views");
    await expect(
      dataViews.getByRole("heading", { name: "Data Views" }),
    ).toBeVisible();
    expect(await dataViews.locator(".chart-wrapper").count()).toBe(1);

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
    await expect(resouce1DownloadLink).toContainText("data/resource-1.csv");
    const downloadPromise = page.waitForEvent("download");
    await resouce1DownloadLink.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("resource-1.csv");

    const filePreviews = page.getByTestId("dp-previews");
    await expect(
      filePreviews.getByRole("heading", { name: "Data Previews" }),
    ).toBeVisible();
    expect(await filePreviews.getByTestId("dp-preview").count()).toBe(2);

    // test first preview
    const preview1 = filePreviews.getByTestId("dp-preview").nth(0);
    await expect(
      preview1.getByRole("heading", { name: "resource-1" }),
    ).toBeVisible();
    expect(preview1.locator(".github-octo-flat-ui")).toBeVisible();

    const readme = page.getByTestId("dp-readme");
    await expect(readme).toBeVisible();
    await expect(readme).toContainText("Some description");
  });
});
