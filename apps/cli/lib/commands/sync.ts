import { existsSync } from "fs";
import { resolve } from "path";
import chalk from "chalk";
import ora from "ora";
import cliProgress from "cli-progress";
import { requireAuth } from "../auth.js";
import { syncFiles, uploadToR2, getSiteByName } from "../api-client.js";
import { discoverFiles, getProjectName, validateFiles } from "../files.js";
import { displayError, displayWarning, waitForSync } from "../utils.js";
import { capture, flushTelemetry, CLI_VERSION } from "../telemetry.js";

interface UploadResult {
  path: string;
  success: boolean;
  error?: string;
}

/**
 * Display sync summary
 */
function displaySyncSummary(
  syncPlan: {
    toUpload: Array<{ path: string }>;
    toUpdate: Array<{ path: string }>;
    deleted: string[];
    unchanged: string[];
    summary: {
      toUpload: number;
      toUpdate: number;
      deleted: number;
      unchanged: number;
    };
  },
  projectName: string,
  verbose: boolean = false,
): void {
  console.log(chalk.bold(`\nSync Summary for '${projectName}':`));

  // Files to upload (new)
  if (syncPlan.summary.toUpload > 0) {
    console.log(
      chalk.cyan(`  📝 New files to upload: ${syncPlan.summary.toUpload}`),
    );
    for (const uploadUrl of syncPlan.toUpload) {
      console.log(chalk.cyan(`    + ${uploadUrl.path}`));
    }
  }

  // Files to update (modified)
  if (syncPlan.summary.toUpdate > 0) {
    console.log(
      chalk.blue(`  🔄 Files to update: ${syncPlan.summary.toUpdate}`),
    );
    for (const updateUrl of syncPlan.toUpdate) {
      console.log(chalk.blue(`    ~ ${updateUrl.path}`));
    }
  }

  // Files to delete
  if (syncPlan.summary.deleted > 0) {
    console.log(
      chalk.yellow(`  🗑️  Files to delete: ${syncPlan.summary.deleted}`),
    );
    for (const deletedPath of syncPlan.deleted) {
      console.log(chalk.yellow(`    - ${deletedPath}`));
    }
  }

  // Unchanged files
  if (syncPlan.summary.unchanged > 0) {
    if (verbose) {
      console.log(
        chalk.green(`  ✅ Files unchanged: ${syncPlan.summary.unchanged}`),
      );
      for (const unchangedPath of syncPlan.unchanged) {
        console.log(chalk.gray(`    • ${unchangedPath}`));
      }
    } else {
      console.log(
        chalk.green(`  ✓ Files unchanged: ${syncPlan.summary.unchanged}`),
      );
      console.log(
        chalk.gray(`\nNote: Use --verbose to see all unchanged files`),
      );
    }
  }
}

/**
 * Check if sync plan has any changes
 */
function hasChanges(syncPlan: {
  summary: { toUpload: number; toUpdate: number; deleted: number };
}): boolean {
  return (
    syncPlan.summary.toUpload > 0 ||
    syncPlan.summary.toUpdate > 0 ||
    syncPlan.summary.deleted > 0
  );
}

/**
 * Display sync success message
 */
function displaySyncSuccess(
  projectName: string,
  username: string,
  summary: {
    toUpload: number;
    toUpdate: number;
    deleted: number;
    unchanged: number;
  },
): void {
  console.log(chalk.green.bold("\n✅ Sync complete!"));
  console.log(
    chalk.cyan(
      `   Site: https://my.flowershow.app/@${username}/${projectName}`,
    ),
  );
  console.log(
    chalk.gray(
      `   New: ${summary.toUpload} | Updated: ${summary.toUpdate} | Deleted: ${summary.deleted} | Unchanged: ${summary.unchanged}`,
    ),
  );
}

/**
 * Sync command - update files in an existing published site
 * @param inputPath - Path to the file or folder to sync
 * @param options - Command options
 */
export async function syncCommand(
  inputPath: string,
  options: {
    name?: string;
    dryRun?: boolean;
    verbose?: boolean;
  } = {},
): Promise<void> {
  const startTime = Date.now();
  capture("command_started", { command: "sync", cli_version: CLI_VERSION });
  try {
    const spinner = ora();

    // Check authentication first
    const user = await requireAuth();
    spinner.succeed(`Syncing as: ${user.username || user.email}`);

    spinner.start("Discovering files...");

    // Validate input path
    const absolutePath = resolve(inputPath);
    if (!existsSync(absolutePath)) {
      displayError(`Path not found: ${inputPath}`);
      process.exit(1);
    }

    // Discover files
    const files = discoverFiles(absolutePath);
    validateFiles(files);

    // Use custom site name if provided, otherwise derive from project
    const projectName = options.name || getProjectName(files);
    spinner.succeed(`Found ${files.length} file(s) in ${inputPath}`);

    // Check if site exists
    const existingSite = await getSiteByName(user.username!, projectName);
    if (!existingSite) {
      displayError(
        `Site '${projectName}' not found.\n` +
          `Use 'flowershow publish' to create it first, or specify a different site name with --name.`,
      );
      process.exit(1);
    }

    // Prepare file metadata for sync request
    const fileMetadata = files.map((file) => ({
      path: file.path,
      size: file.size,
      sha: file.sha,
    }));

    // Get sync plan from API
    spinner.start("Analyzing changes...");
    const syncPlan = await syncFiles(
      existingSite.site.id,
      fileMetadata,
      options.dryRun || false,
    );
    spinner.stop();

    // Check if there are any changes
    if (!hasChanges(syncPlan)) {
      console.log(chalk.green.bold("\n✅ Already in sync!"));
      console.log(chalk.gray(`   All ${files.length} file(s) are up to date.`));
      console.log(
        chalk.cyan(
          `   Site: https://my.flowershow.app/@${
            user.username || user.email
          }/${projectName}`,
        ),
      );
      return;
    }

    // Display sync summary
    displaySyncSummary(syncPlan, projectName, options.verbose || false);

    // If dry-run, exit here
    if (options.dryRun || syncPlan.dryRun) {
      console.log(
        chalk.yellow(
          "\n🔍 Dry run complete - no changes were made to your site",
        ),
      );
      console.log(
        chalk.gray("   Run without --dry-run to apply these changes"),
      );
      return;
    }

    // Upload new and changed files
    const allFilesToUpload = [...syncPlan.toUpload, ...syncPlan.toUpdate];
    if (allFilesToUpload.length > 0) {
      const uploadBar = new cliProgress.SingleBar(
        {
          format:
            "Uploading |" +
            chalk.cyan("{bar}") +
            "| {percentage}% | {value}/{total} files",
          barCompleteChar: "\u2588",
          barIncompleteChar: "\u2591",
          hideCursor: true,
        },
        cliProgress.Presets.shades_classic,
      );

      uploadBar.start(allFilesToUpload.length, 0);

      const uploadResults: UploadResult[] = [];
      for (let i = 0; i < allFilesToUpload.length; i++) {
        const uploadInfo = allFilesToUpload[i];
        if (!uploadInfo) continue;

        const file = files.find((f) => f.path === uploadInfo.path);
        if (!file) {
          uploadResults.push({
            path: uploadInfo.path,
            success: false,
            error: "File not found in local files",
          });
          uploadBar.increment();
          continue;
        }

        try {
          await uploadToR2(
            uploadInfo.uploadUrl,
            file.content,
            uploadInfo.contentType,
          );
          uploadResults.push({ path: file.path, success: true });
          uploadBar.increment();
        } catch (error) {
          uploadResults.push({
            path: file.path,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          uploadBar.increment();
        }
      }

      uploadBar.stop();

      const failedUploads = uploadResults.filter((r) => !r.success);
      if (failedUploads.length > 0) {
        console.log(
          chalk.yellow(`⚠️  ${failedUploads.length} file(s) failed to upload`),
        );
        for (const result of failedUploads) {
          console.log(chalk.yellow(`  - ${result.path}: ${result.error}`));
        }
      } else {
        if (syncPlan.toUpload.length > 0) {
          console.log(
            chalk.green(`✓ Uploaded ${syncPlan.toUpload.length} new file(s)`),
          );
        }
        if (syncPlan.toUpdate.length > 0) {
          console.log(
            chalk.green(`✓ Updated ${syncPlan.toUpdate.length} file(s)`),
          );
        }
      }
    }

    // Display deletion confirmation
    // Note: Deletions were already performed by the API during the sync request
    if (syncPlan.deleted.length > 0) {
      console.log(chalk.green(`✓ Deleted ${syncPlan.deleted.length} file(s)`));
    }

    // Wait for markdown files to be processed
    const syncResult = await waitForSync(existingSite.site.id, 30);

    if (syncResult.timeout) {
      displayWarning(
        "Some files are still processing after 30 seconds.\n" +
          "Your site is available but some pages may not be ready yet.\n" +
          "Check back in a moment.",
      );
    } else if (!syncResult.success && syncResult.errors) {
      displayWarning("Some files had processing errors (see above).");
    }

    // Display success
    capture("command_succeeded", {
      command: "sync",
      cli_version: CLI_VERSION,
      duration_ms: Date.now() - startTime,
    });
    displaySyncSuccess(
      projectName,
      user.username || user.email || "user",
      syncPlan.summary,
    );
  } catch (error) {
    capture("command_failed", {
      command: "sync",
      cli_version: CLI_VERSION,
      duration_ms: Date.now() - startTime,
      error_type: error instanceof Error ? error.constructor.name : "Unknown",
      error_message: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Error) {
      displayError(error.message);
      console.error(chalk.gray(error.stack));
    } else {
      displayError("An unknown error occurred");
    }
    await flushTelemetry();
    process.exit(1);
  } finally {
    await flushTelemetry();
  }
}
