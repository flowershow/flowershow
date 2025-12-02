import { type Page } from "@playwright/test";

export class PublishedSitePage {
  readonly page: Page;
  readonly siteName: string;
  readonly siteUrlPath: string;
  readonly siteUrl: string;
  readonly domain: string;

  constructor(page: Page, siteName: string, customDomain?: string) {
    this.page = page;
    this.siteName = siteName;
    this.domain = customDomain ?? process.env.NEXT_PUBLIC_ROOT_DOMAIN!;
    this.siteUrlPath = customDomain
      ? ""
      : `/@${process.env.GH_E2E_TEST_ACCOUNT}/${siteName}`;
    this.siteUrl = `http://${this.domain}${this.siteUrlPath ?? ""}`;
  }

  /** path should start with leading slash */
  async goto(path?: string) {
    return await this.page.goto(`${this.siteUrl}${path ?? ""}`);
  }
}
