import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  addIcon,
  PluginManifest,
} from "obsidian";

import { IFlowershowSettings, DEFAULT_SETTINGS } from "src/settings";
import Publisher from "src/Publisher";
import PublishStatusBar from "src/PublishStatusBar";
import { PublishStatusModal } from "src/components/PublishStatusModal";
import { UpdateModal } from "src/components/UpdateModal";
import SettingView from "src/SettingView";

import { flowershowIcon } from "src/constants";
import { FlowershowError, createSiteNotice } from "src/utils";

export default class Flowershow extends Plugin {
  private startupAnalytics: string[] = [];
  private lastLogTimestamp: number;
  private loadTimestamp: number;
  private publishStatusModal: PublishStatusModal;
  private statusBarItem: HTMLElement;
  public statusBar: PublishStatusBar;

  public settings: IFlowershowSettings;
  public publisher: Publisher;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    this.loadTimestamp = Date.now();
    this.lastLogTimestamp = this.loadTimestamp;
    this.startupAnalytics = [];
  }

  async onload() {
    this.logStartupEvent("Plugin Constructor ready, starting onload()");

    await this.loadSettings();

    // Show update modal for users who haven't seen v4.0 changes
    this.showUpdateModalIfNeeded();

    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.addClass("mod-clickable");
    this.statusBarItem.createEl("span", { text: "💐" });
    this.statusBarItem.addEventListener("click", () => {
      this.openPublishStatusModal();
    });
    const statusContainer = this.statusBarItem.createSpan();
    this.statusBar = new PublishStatusBar(statusContainer);

    this.publisher = new Publisher(this.app, this.settings, this.statusBar);

    this.addSettingTab(new FlowershowSettingTab(this.app, this));
    await this.addCommands();

    addIcon("flowershow-icon", flowershowIcon);
    this.addRibbonIcon(
      "flowershow-icon",
      "Publish with Flowershow",
      async () => {
        this.openPublishStatusModal();
      },
    );
  }

  onunload() {
    if (this.statusBarItem) {
      this.statusBarItem.remove();
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    // Recreate publisher with updated settings
    this.publisher = new Publisher(this.app, this.settings, this.statusBar);
    // Clear cached modal so it picks up new publisher
    this.publishStatusModal = null!;
  }

  async addCommands() {
    this.addCommand({
      id: "publish-single-note",
      name: "Publish single note (with embeds)",
      checkCallback: (checking) => {
        if (checking) {
          const currentFile = this.app.workspace.getActiveFile();
          return !!currentFile && currentFile.extension === "md";
        }
        this.publishSingleNote();
      },
    });

    this.addCommand({
      id: "publish-all-files",
      name: "Publish all",
      checkCallback: (checking: boolean) => {
        if (checking) {
          return true;
        }
        this.publishAllFiles();
      },
    });
  }

  /** Publish single note and its embeds */
  // TODO make sure that embeds in frontmatter are published too!
  async publishSingleNote() {
    try {
      const currentFile = this.app.workspace.getActiveFile();
      if (!currentFile) {
        new Notice("No file is open. Open a note and try again.");
        return;
      }
      if (currentFile.extension !== "md") {
        new Notice(
          "This isn't a Markdown file. Open a .md note and try again.",
        );
        return;
      }
      new Notice("⌛ Publishing note...");
      const result =
        await this.publisher.publishSingleNoteWithEmbeds(currentFile);
      const frag = createSiteNotice(
        `Published ${result.filesPublished} file(s).`,
        result.siteUrl,
      );
      new Notice(frag, 8000);
    } catch (e: any) {
      console.error(e);
      if (e instanceof FlowershowError) {
        new Notice(`❌ Can't publish note: ${e.message}`);
      } else {
        new Notice(`❌ Can't publish note.`);
      }
      throw e;
    }
  }

  // Publish new or changed files, and unpublish deleted files
  async publishAllFiles() {
    try {
      const { changedFiles, deletedFiles, newFiles } =
        await this.publisher.getPublishStatus();
      // console.log({ changedFiles, deletedFiles, newFiles })

      const filesToDelete = deletedFiles;
      const filesToPublish = changedFiles.concat(newFiles);

      if (!filesToDelete.length && !filesToPublish.length) {
        new Notice("❌ Nothing new to publish or delete.");
        return;
      }

      const result = await this.publisher.publishBatch({
        filesToPublish,
        filesToDelete,
      });

      const frag = createSiteNotice(
        `Published ${result.filesPublished} file(s).`,
        result.siteUrl,
      );
      new Notice(frag, 8000);
    } catch (e: any) {
      console.error(e);
      if (e instanceof FlowershowError) {
        new Notice(`❌ Can't publish notes: ${e.message}`);
      } else {
        new Notice(
          "❌ Can't publish notes. Check console errors for more info.",
        );
      }
    }
  }

  openPublishStatusModal() {
    if (!this.publishStatusModal) {
      this.publishStatusModal = new PublishStatusModal({
        app: this.app,
        publisher: this.publisher,
        settings: this.settings,
      });
    }
    this.publishStatusModal.open();
  }

  public logStartupEvent(message: string) {
    const timestamp = Date.now();
    this.startupAnalytics.push(
      `${message}\nTotal: ${timestamp - this.loadTimestamp}ms Delta: ${
        timestamp - this.lastLogTimestamp
      }ms\n`,
    );
    this.lastLogTimestamp = timestamp;
  }

  private showUpdateModalIfNeeded() {
    // Show modal if user hasn't seen any version yet (new user or upgrading from pre-4.0)
    if (
      !this.settings.lastSeenVersion ||
      this.settings.lastSeenVersion < "4.0.0"
    ) {
      const modal = new UpdateModal(this.app, async () => {
        // Save current version after modal is closed
        this.settings.lastSeenVersion = this.manifest.version;
        await this.saveSettings();
      });
      modal.open();
    }
  }
}

class FlowershowSettingTab extends PluginSettingTab {
  plugin: Flowershow;

  constructor(app: App, plugin: Flowershow) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const settingView = new SettingView(
      containerEl,
      this.plugin.publisher,
      this.plugin.settings,
      async () => {
        await this.plugin.saveSettings();
      },
    );
    settingView.initialize();
  }
}
