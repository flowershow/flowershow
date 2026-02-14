import { App, Modal } from "obsidian";

export class UpdateModal extends Modal {
  private onCloseCallback: () => void;

  constructor(app: App, onCloseCallback?: () => void) {
    super(app);
    this.onCloseCallback = onCloseCallback || (() => {});
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("flowershow-update-modal");

    // Header
    contentEl.createEl("h2", { text: "🌸 Flowershow Plugin 4.0" });

    // Main content
    const content = contentEl.createEl("div", { cls: "update-modal-content" });

    // Action required callout
    const actionRequired = content.createEl("div", {
      cls: "update-modal-callout",
    });
    actionRequired.style.cssText = `
			border: 1px solid var(--background-modifier-error-hover);
			border-radius: 6px;
			padding: 12px;
			margin-bottom: 16px;
		`;
    actionRequired.innerHTML = `
			<p style="margin: 0; font-weight: 600;">⚠️ Action required to continue publishing</p>
			<p style="margin: 8px 0 0 0;">This update changes how the plugin connects to Flowershow. You have two options:</p>
		`;

    const changesList = content.createEl("div", {
      cls: "update-modal-changes",
    });
    changesList.style.cssText = "margin-top: 16px;";
    changesList.innerHTML = `
			<p><strong>What changed:</strong></p>
			<ul>
				<li>The plugin now publishes <strong>directly to Flowershow</strong> — no GitHub repository required.</li>
				<li>Faster publishing with immediate feedback.</li>
			</ul>
		`;

    const optionsBox = content.createEl("div", { cls: "update-modal-options" });
    optionsBox.style.cssText = "margin-top: 16px;";
    optionsBox.innerHTML = `
			<p><strong>Choose your workflow:</strong></p>
			
			<div style="background-color: var(--background-secondary); border-radius: 6px; padding: 12px; margin-bottom: 12px;">
				<p style="margin: 0 0 8px 0; font-weight: 600;">Option A: Switch to Direct Publishing (Recommended)</p>
				<ol style="margin: 8px 0 0 0; padding-left: 20px;">
					<li><strong>Disconnect your site from GitHub</strong> in your <a href="https://cloud.flowershow.app/dashboard">dashboard</a> to prevent sync conflicts</li>
					<li>Generate a Personal Access Token at <a href="https://cloud.flowershow.app/tokens">cloud.flowershow.app/tokens</a></li>
					<li>Enter it in the plugin settings</li>
					<li>If you used <code>rootDir</code> config before, set it up in the plugin settings</li>
					<li>Publish as usual!</li>
				</ol>
			</div>
			
			<div style="background-color: var(--background-secondary); border-radius: 6px; padding: 12px;">
				<p style="margin: 0 0 8px 0; font-weight: 600;">Option B: Keep Using GitHub</p>
				<ol style="margin: 8px 0 0 0; padding-left: 20px;">
					<li><strong>Uninstall this Flowershow plugin</strong></li>
					<li>Use another tool (e.g. Obsidian Git plugin) to sync your vault to GitHub</li>
					<li>Flowershow Cloud will continue to publish from your repository</li>
				</ol>
			</div>
		`;

    // Learn more link
    const learnMore = content.createEl("p");
    learnMore.createEl("a", {
      text: "Learn more about this update →",
      href: "https://flowershow.app/blog/announcing-obsidian-plugin-4",
    });

    // Button container
    const buttonContainer = contentEl.createEl("div", {
      cls: "update-modal-buttons",
    });
    buttonContainer.style.cssText =
      "display: flex; justify-content: flex-end; margin-top: 20px;";

    const gotItButton = buttonContainer.createEl("button", {
      text: "Got it!",
      cls: "mod-cta",
    });
    gotItButton.addEventListener("click", () => {
      this.close();
    });

    // Add some basic styling
    contentEl.style.cssText = "max-width: 500px;";
  }

  close() {
    super.close();
    this.onCloseCallback();
  }
}
