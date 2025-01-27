import { test, expect } from "@playwright/test";
import { testSite } from "./test-utils";

test.describe.configure({ mode: "parallel" });

test.describe("Old /r endpoints (for resources)", () => {
  const resourceId = "test123";
  const resourceName = "test";
  const resourcePath = "data/test.csv";

  test("Should redirect to R2 and download the file if passed resource name + correct extension", async ({
    request,
  }) => {
    const response = await request.get(`/${testSite}/r/${resourceName}.csv`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("text/csv");
  });

  test("Should redirect to R2 and download the file if passed resource id + correct extension", async ({
    request,
  }) => {
    const response = await request.get(`/${testSite}/r/${resourceId}.csv`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("text/csv");
  });

  test("Should return 400 with info if passed resource name + json extension", async ({
    request,
  }) => {
    const response = await request.get(`/${testSite}/r/${resourceName}.json`);
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toMatch(
      `${testSite}/_r/-/${resourcePath}`,
    );
  });

  test("Should return 400 with info if passed resource name + html extension", async ({
    request,
  }) => {
    const response = await request.get(`/${testSite}/r/${resourceName}.html`);
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toMatch(
      `${testSite}/_r/-/${resourcePath}`,
    );
  });

  test("Should return 404 if passed non-existent resource name", async ({
    request,
  }) => {
    const response = await request.get(`/${testSite}/r/nonexistent.csv`);
    expect(response.status()).toBe(404);
  });
});

test.describe("NEW /r endpoints (for file paths)", () => {
  const resourcePath = "data/test.csv";
  const assetPath = "assets/image.jpg";

  test("Should redirect to R2 and download the file if passed correct file path", async ({
    request,
  }) => {
    const response = await request.get(`/${testSite}/_r/-/${resourcePath}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("text/csv");
  });

  test("Should work for any file (e.g. jpg)", async ({ request }) => {
    const response = await request.get(`/${testSite}/_r/-/${assetPath}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/jpeg");
  });
});
