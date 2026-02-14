import Publisher from "./Publisher";
import { IFlowershowSettings } from "./settings";
import { Notice, Setting, debounce, MetadataCache } from "obsidian";

export default class SettingView {
  private publisher: Publisher;
  private settings: IFlowershowSettings;
  private saveSettings: () => Promise<void>;
  private settingsRootElement: HTMLElement;
  debouncedSaveAndUpdate = debounce(
    this.saveSiteSettingsAndUpdateEnv,
    500,
    true,
  );

  constructor(
    settingsRootElement: HTMLElement,
    publisher: Publisher,
    settings: IFlowershowSettings,
    saveSettings: () => Promise<void>,
  ) {
    this.publisher = publisher;
    this.settingsRootElement = settingsRootElement;
    this.settingsRootElement.classList.add("dg-settings");
    this.settings = settings;
    this.saveSettings = saveSettings;
  }

  initialize() {
    this.settingsRootElement.empty();

    // v4.0 Breaking Change Info Box
    const infoBox = this.settingsRootElement.createEl("div", {
      cls: "dg-info-box",
    });
    infoBox.style.cssText = `
			background-color: var(--background-modifier-info);
			border: 1px solid var(--background-modifier-border);
			border-radius: 8px;
			padding: 16px;
			margin-bottom: 20px;
		`;

    infoBox.createEl("div", {
      text: "🌸 New in v4.0",
      cls: "dg-info-box-title",
    }).style.cssText = `
			font-weight: 600;
			margin-bottom: 8px;
			font-size: 1.1em;
		`;

    const infoContent = infoBox.createEl("div");
    infoContent.innerHTML = `
			<p style="margin: 0 0 8px 0;">The Flowershow plugin now publishes <strong>directly to Flowershow</strong> — no GitHub repository required.</p>
			<p style="margin: 0 0 8px 0;">You'll need a <strong>Flowershow Personal Access Token</strong> to publish. Generate one at <a href="https://cloud.flowershow.app/tokens">cloud.flowershow.app/tokens</a>.</p>
			<p style="margin: 0 0 8px 0;"><strong>Want to keep using GitHub?</strong> Use a separate tool (e.g. Obsidian Git) to sync your vault to GitHub. Flowershow Cloud will continue to publish from your repository.</p>
			<p style="margin: 0;"><a href="https://flowershow.app/blog/announcing-obsidian-plugin-4">Learn more about this update →</a></p>
		`;

    // Link to Flowershow
    const linkDiv = this.settingsRootElement.createEl("div");

    linkDiv.createEl("a", {
      text: "Sign up for Flowershow →",
      href: "https://cloud.flowershow.app/login?utm_source=obsidian&utm_medium=referral",
    });
    linkDiv.setCssProps({ padding: "15px 0" });

    // Authentication section
    const authHeader = this.settingsRootElement.createEl("h2", {
      text: "Authentication",
    });

    this.initializeTokenSetting();
    this.initializeSiteNameSetting();

    // Publishing settings
    const publishHeader = this.settingsRootElement.createEl("h2", {
      text: "Publishing Settings",
    });
    this.initializeRootDirSetting();
    this.initializeExcludePatternsSetting();
  }

  private async saveSiteSettingsAndUpdateEnv(
    metadataCache: MetadataCache,
    settings: IFlowershowSettings,
    saveSettings: () => Promise<void>,
  ) {
    let updateFailed = false;
    try {
      await saveSettings();
    } catch {
      new Notice(
        "Failed to update settings. Make sure you have an internet connection.",
      );
      updateFailed = true;
    }

    if (!updateFailed) {
      await saveSettings();
    }
  }

  private initializeTokenSetting() {
    const desc = document.createDocumentFragment();
    desc.createEl("span", undefined, (span) => {
      span.appendText(
        "Your Flowershow Personal Access Token (PAT). You can generate one ",
      );
      span.createEl("a", undefined, (link) => {
        link.href =
          "https://cloud.flowershow.app/tokens?utm_source=obsidian&utm_medium=referral";
        link.innerText = "here!";
      });
      span.createEl("br");
      span.createEl("br");
      span.appendText("The token should start with ");
      span.createEl("code", { text: "fs_pat_" });
    });

    new Setting(this.settingsRootElement)
      .setName("Flowershow PAT Token")
      .setDesc(desc)
      .addText((text) =>
        text
          .setPlaceholder("fs_pat_...")
          .setValue(this.settings.flowershowToken)
          .onChange(async (value) => {
            this.settings.flowershowToken = value;
            await this.saveSettings();
          }),
      );
  }

  private initializeSiteNameSetting() {
    new Setting(this.settingsRootElement)
      .setName("Site Name")
      .setDesc(
        "Name of your Flowershow site (will be created if it doesn't exist)",
      )
      .addText((text) =>
        text
          .setPlaceholder("my-notes")
          .setValue(this.settings.siteName)
          .onChange(async (value) => {
            this.settings.siteName = value;
            await this.saveSettings();
          }),
      );
  }

  private initializeRootDirSetting() {
    new Setting(this.settingsRootElement)
      .setName("Root Directory")
      .setDesc(
        "Publish only files within this folder. Leave empty to publish entire vault.",
      )
      .addText((text) =>
        text
          .setPlaceholder("my-folder")
          .setValue(this.settings.rootDir)
          .onChange(async (value) => {
            // Normalize the path - remove leading/trailing slashes
            const normalized = value.trim().replace(/^\/+|\/+$/g, "");
            this.settings.rootDir = normalized;
            await this.saveSettings();
          }),
      );
  }

  private initializeExcludePatternsSetting() {
    const settingContainer = this.settingsRootElement.createDiv(
      "exclude-patterns-container",
    );

    new Setting(settingContainer)
      .setName("Exclude Patterns")
      .setDesc(
        "Regex patterns to exclude files and folders from publishing. One pattern per line. Patterns match against the full path from vault root.",
      )
      .addTextArea((textarea) => {
        textarea
          .setPlaceholder("^\\.git/\n^node_modules/\n\\.DS_Store$")
          .setValue(this.settings.excludePatterns.join("\n"))
          .onChange(async (value) => {
            // Split by newlines and filter out empty lines
            const patterns = value
              .split("\n")
              .filter((pattern) => pattern.trim() !== "");
            this.settings.excludePatterns = patterns;
            await this.saveSettings();
          });

        // Adjust textarea height
        textarea.inputEl.rows = 4;
        textarea.inputEl.style.width = "100%";
      });

    // Add a help text with examples
    const helpText = settingContainer.createEl("div", {
      cls: "setting-item-description",
    });
    helpText.innerHTML = `
      <strong>Note:</strong> Patterns match against full paths from vault root.<br>
      Examples:<br>
      • <code>^private/</code> - Exclude the "private" folder at vault root<br>
      • <code>^blog/drafts/</code> - Exclude "drafts" folder inside "blog" folder<br>
      • <code>\\.excalidraw\\.md$</code> - Exclude all Excalidraw files<br>
      • <code>\\.tmp$</code> - Exclude all .tmp files anywhere in vault
    `;
  }
}
