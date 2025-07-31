import { expect, type Locator, type Page } from "@playwright/test";

export class PublishedSitePage {
  readonly page: Page;
  readonly siteName: string;
  readonly siteUrlPath: string;
  readonly customDomain?: string;

  constructor(page: Page, siteName: string, customDomain?: string) {
    this.page = page;
    this.siteName = siteName;
    this.customDomain = customDomain;
    this.siteUrlPath = customDomain
      ? "/"
      : `/@${process.env.GH_E2E_TEST_ACCOUNT}/${siteName}`;
  }

  /** path should start with leading slash */
  async goto(path?: string) {
    if (this.customDomain) {
      return await this.page.goto(`http://${this.customDomain}${path ?? ""}`);
    }

    return await this.page.goto(
      `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/${this.siteUrlPath}${
        path ?? ""
      }`,
    );
  }
}
