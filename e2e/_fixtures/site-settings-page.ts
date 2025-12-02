import { expect, type Locator, type Page } from "@playwright/test";

export class SiteSettingsPage {
  readonly page: Page;
  readonly siteId: string;
  readonly siteName: Locator;
  readonly nameInput: Locator;
  readonly nameSaveButton: Locator;
  // readonly branchInput: Locator;
  // readonly branchSaveButton: Locator;
  // readonly rootDirInput: Locator;
  // readonly rootDirSaveButton: Locator;
  // readonly autoSyncSwitch: Locator;
  // readonly commentsSwitch: Locator;
  readonly customDomainInput: Locator;
  readonly customDomainSaveButton: Locator;
  readonly fullTextSearchSwitch: Locator;
  readonly billingMonthlyRadio: Locator;
  readonly billingAnnuallyRadio: Locator;
  readonly upgradeButton: Locator;
  readonly manageSubscriptionButton: Locator;
  readonly infoMessage: Locator;

  constructor(page: Page, siteId: string) {
    this.page = page;
    this.siteId = siteId;
    this.siteName = page.getByTestId("site-name");
    this.nameInput = page.locator('input[name="projectName"]');
    this.nameSaveButton = page.getByTestId("save-projectName");
    this.customDomainInput = page.locator('input[name="customDomain"]');
    this.customDomainSaveButton = page.getByTestId("save-customDomain");
    this.fullTextSearchSwitch = page
      .getByTestId("config-enableSearch")
      .getByRole("switch");
    this.billingMonthlyRadio = page.getByRole("radio", { name: "Monthly" });
    this.billingAnnuallyRadio = page.getByRole("radio", { name: "Annually" });
    this.upgradeButton = page.getByRole("button", {
      name: /Upgrade to Premium/i,
    });
    this.manageSubscriptionButton = page.getByRole("button", {
      name: /Manage Subscription/i,
    });
    this.infoMessage = page.getByRole("status");
  }

  async goto() {
    await this.page.goto(
      `http://${process.env.NEXT_PUBLIC_CLOUD_DOMAIN}/site/${this.siteId}/settings`,
    );
  }

  async upgradeToPremium() {
    await this.billingAnnuallyRadio.click();

    const errors: string[] = [];
    this.page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await Promise.all([
      this.page.waitForResponse((response) =>
        response.url().includes("/api/trpc/stripe.createCheckoutSession"),
      ),
      this.upgradeButton.click(),
    ]);

    // Wait for navigation to Stripe and complete checkout
    await this.page
      .waitForURL(
        (url: URL) => url.toString().includes("checkout.stripe.com"),
        { timeout: 10000 },
      )
      .catch(async (error) => {
        console.log("Current URL:", await this.page.url());
        console.log("Console errors:", errors);
        throw error;
      });

    // Fill in test card details
    await this.page.getByLabel("Card number").fill("4242424242424242");
    await this.page.getByLabel("Expiration").fill("1234");
    await this.page.getByPlaceholder("CVC").fill("123");
    await this.page.locator("#billingName").fill("Test User");

    // Complete checkout
    await this.page.getByRole("button", { name: /Subscribe/i }).click();

    // Wait for redirect back to success page
    await this.page.waitForURL(
      (url: URL) => url.toString().includes("upgrade_success=true"),
      { timeout: 20000 },
    );
  }

  async delete() {
    const siteName = await this.siteName.textContent();
    expect(siteName).not.toBeNull();
    const deleteSiteInput = this.page.getByTestId("delete-site-input");
    deleteSiteInput.fill(siteName!.trim());
    await this.page.getByRole("button", { name: /Confirm Delete/i }).click();
  }
}
